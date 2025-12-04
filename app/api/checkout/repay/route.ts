import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/utils/supabase/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
const utility = require("utility");

// 生成签名参数字符串
function getVerifyParams(params: Record<string, any>): string {
  const sPara: [string, any][] = [];
  
  for (const key in params) {
    if (!params[key] || key === "sign" || key === "sign_type") {
      continue;
    }
    sPara.push([key, params[key]]);
  }
  
  // 按照参数名ASCII码从小到大排序
  sPara.sort((a, b) => a[0].localeCompare(b[0]));
  
  let prestr = "";
  for (let i = 0; i < sPara.length; i++) {
    const obj = sPara[i];
    if (i === sPara.length - 1) {
      prestr = prestr + obj[0] + "=" + obj[1];
    } else {
      prestr = prestr + obj[0] + "=" + obj[1] + "&";
    }
  }
  
  return prestr;
}

export async function POST(request: NextRequest) {
  try {
    // 检查必需的环境变量
    const requiredEnvVars = {
      ZPAY_PID: process.env.ZPAY_PID,
      ZPAY_KEY: process.env.ZPAY_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };

    // 验证环境变量
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      return NextResponse.json(
        { 
          error: `支付配置错误：缺少环境变量 ${missingVars.join(', ')}`,
        },
        { status: 500 }
      );
    }
    
    // 获取当前用户
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "未登录，请先登录" },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "缺少订单ID" },
        { status: 400 }
      );
    }

    // 获取订单信息
    const adminClient = createServerAdminClient();
    const { data: transaction, error: transactionError } = await adminClient
      .from("zpay_transactions")
      .select("*")
      .eq("out_trade_no", orderId)
      .eq("user_id", user.id)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "订单不存在或无权访问" },
        { status: 404 }
      );
    }

    // 检查订单状态
    if (transaction.payment_status !== "pending") {
      return NextResponse.json(
        { error: "订单状态不允许重新支付" },
        { status: 400 }
      );
    }

    // 构建支付参数
    const notifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/checkout/providers/zpay/webhook`;
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`;

    const paymentParams: Record<string, any> = {
      pid: process.env.ZPAY_PID,
      money: transaction.money.toString(),
      name: transaction.product_name,
      notify_url: notifyUrl,
      out_trade_no: transaction.out_trade_no,
      return_url: returnUrl,
      type: transaction.payment_type,
    };

    // 生成签名
    const paramStr = getVerifyParams(paymentParams);
    const sign = utility.md5(paramStr + process.env.ZPAY_KEY);

    // 构建支付URL
    const paymentUrl = `https://zpayz.cn/submit.php?${paramStr}&sign=${sign}&sign_type=MD5`;

    return NextResponse.json({
      success: true,
      paymentUrl,
      outTradeNo: transaction.out_trade_no,
      transaction,
    });
  } catch (error) {
    console.error("重新生成支付链接失败:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}