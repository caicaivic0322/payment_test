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

// 生成订单号
function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

// 计算订阅结束时间
function calculateSubscriptionDates(
  userId: string,
  period: "monthly" | "yearly",
  currentEndDate?: Date
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  // 如果用户已有订阅且未过期，从过期时间开始计算
  let startDate: Date;
  if (currentEndDate && currentEndDate > now) {
    startDate = new Date(currentEndDate);
    console.log(`用户已有订阅，新订阅将从 ${startDate.toISOString()} 开始`);
  } else {
    startDate = now;
    console.log(`用户无有效订阅，新订阅将从 ${startDate.toISOString()} 开始`);
  }
  
  const endDate = new Date(startDate);
  if (period === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
    console.log(`月付订阅，结束时间: ${endDate.toISOString()}`);
  } else if (period === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
    console.log(`年付订阅，结束时间: ${endDate.toISOString()}`);
  }
  
  return { startDate, endDate };
}

export async function POST(request: NextRequest) {
  try {
    // === 环境变量验证 ===
    console.log('=== ZPay 支付请求 ===');
    console.log('时间:', new Date().toISOString());
    
    // 检查必需的环境变量
    const requiredEnvVars = {
      ZPAY_PID: process.env.ZPAY_PID,
      ZPAY_KEY: process.env.ZPAY_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };

    console.log('环境变量状态:');
    console.log('  - ZPAY_PID:', requiredEnvVars.ZPAY_PID ? 
      `${requiredEnvVars.ZPAY_PID.substring(0, 10)}... (长度: ${requiredEnvVars.ZPAY_PID.length})` : 
      '❌ 未设置');
    console.log('  - ZPAY_KEY:', requiredEnvVars.ZPAY_KEY ? 
      `已设置 (长度: ${requiredEnvVars.ZPAY_KEY.length})` : 
      '❌ 未设置');
    console.log('  - BASE_URL:', requiredEnvVars.NEXT_PUBLIC_BASE_URL || '❌ 未设置');

    // 验证环境变量
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('❌ 缺少必需的环境变量:', missingVars);
      return NextResponse.json(
        { 
          error: `支付配置错误：缺少环境变量 ${missingVars.join(', ')}`,
          details: {
            message: '请检查 .env.local 文件并重启开发服务器',
            missingVars,
            help: '查看 ZPAY_ERROR_TROUBLESHOOTING.md 获取帮助',
          }
        },
        { status: 500 }
      );
    }

    console.log('✅ 环境变量验证通过');
    
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
    const { productId, paymentType = "alipay" } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "缺少产品ID" },
        { status: 400 }
      );
    }

    // 验证支付方式
    if (!["alipay", "wxpay"].includes(paymentType)) {
      return NextResponse.json(
        { error: "不支持的支付方式" },
        { status: 400 }
      );
    }

    // 获取产品信息
    const productsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/products`
    );
    const productsData = await productsResponse.json();
    const product = productsData.products[productId];

    if (!product) {
      return NextResponse.json(
        { error: "产品不存在" },
        { status: 404 }
      );
    }

    // 生成订单号
    const outTradeNo = generateOrderNo();

    // 准备订阅信息
    let subscriptionStartDate: Date | null = null;
    let subscriptionEndDate: Date | null = null;

    if (product.isSubscription) {
      // 检查用户是否已有订阅
      const adminClient = createServerAdminClient();
      const { data: existingSubscriptions } = await adminClient
        .from("zpay_transactions")
        .select("subscription_end_date")
        .eq("user_id", user.id)
        .eq("is_subscription", true)
        .eq("payment_status", "success")
        .order("subscription_end_date", { ascending: false })
        .limit(1);

      const currentEndDate = existingSubscriptions?.[0]?.subscription_end_date
        ? new Date(existingSubscriptions[0].subscription_end_date)
        : undefined;
        
      console.log(`用户当前订阅结束时间: ${currentEndDate ? currentEndDate.toISOString() : '无有效订阅'}`);

      const dates = calculateSubscriptionDates(
        user.id,
        product.subscriptionPeriod as "monthly" | "yearly",
        currentEndDate
      );

      subscriptionStartDate = dates.startDate;
      subscriptionEndDate = dates.endDate;
      
      console.log(`新订阅时间: ${subscriptionStartDate.toISOString()} 至 ${subscriptionEndDate.toISOString()}`);
    }

    // 创建交易记录
    const adminClient = createServerAdminClient();
    const { data: transaction, error: insertError } = await adminClient
      .from("zpay_transactions")
      .insert({
        user_id: user.id,
        out_trade_no: outTradeNo,
        product_id: productId,
        product_name: product.name,
        money: parseFloat(product.price),
        payment_type: paymentType,
        payment_status: "pending",
        is_subscription: product.isSubscription || false,
        subscription_period: product.subscriptionPeriod || null,
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        param: JSON.stringify({ userId: user.id, productId }),
      })
      .select()
      .single();

    if (insertError) {
      console.error("创建交易记录失败:", insertError);
      return NextResponse.json(
        { error: "创建订单失败" },
        { status: 500 }
      );
    }

    // 构建支付参数
    const notifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/checkout/providers/zpay/webhook`;
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`;

    const paymentParams: Record<string, any> = {
      pid: process.env.ZPAY_PID,
      money: product.price,
      name: product.name,
      notify_url: notifyUrl,
      out_trade_no: outTradeNo,
      return_url: returnUrl,
      type: paymentType,
    };

    // 生成签名
    const paramStr = getVerifyParams(paymentParams);
    const sign = utility.md5(paramStr + process.env.ZPAY_KEY);

    // 构建支付URL
    const paymentUrl = `https://zpayz.cn/submit.php?${paramStr}&sign=${sign}&sign_type=MD5`;

    return NextResponse.json({
      success: true,
      paymentUrl,
      outTradeNo,
      transaction,
    });
  } catch (error) {
    console.error("生成支付链接失败:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
