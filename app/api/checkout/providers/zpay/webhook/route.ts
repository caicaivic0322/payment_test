import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/utils/supabase/server";
const utility = require("utility");

// 生成签名参数字符串（与支付URL生成相同的逻辑）
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

// 验证签名
function verifySign(params: Record<string, any>, receivedSign: string): boolean {
  const paramStr = getVerifyParams(params);
  const calculatedSign = utility.md5(paramStr + process.env.ZPAY_KEY);
  return calculatedSign === receivedSign;
}

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    
    const pid = searchParams.get("pid");
    const name = searchParams.get("name");
    const money = searchParams.get("money");
    const outTradeNo = searchParams.get("out_trade_no");
    const tradeNo = searchParams.get("trade_no");
    const param = searchParams.get("param");
    const tradeStatus = searchParams.get("trade_status");
    const type = searchParams.get("type");
    const sign = searchParams.get("sign");
    const signType = searchParams.get("sign_type");

    // 验证必要参数
    if (!pid || !money || !outTradeNo || !tradeNo || !tradeStatus || !sign) {
      console.error("缺少必要参数");
      return new NextResponse("fail", { status: 400 });
    }

    // 构建参数对象用于验证签名
    const params: Record<string, any> = {
      pid,
      name,
      money,
      out_trade_no: outTradeNo,
      trade_no: tradeNo,
      trade_status: tradeStatus,
      type,
    };

    if (param) {
      params.param = param;
    }

    // 验证签名
    if (!verifySign(params, sign)) {
      console.error("签名验证失败");
      return new NextResponse("fail", { status: 400 });
    }

    // 验证PID
    if (pid !== process.env.ZPAY_PID) {
      console.error("PID不匹配");
      return new NextResponse("fail", { status: 400 });
    }

    // 使用管理员客户端查询交易记录
    const adminClient = createServerAdminClient();
    
    // 查询订单
    const { data: transaction, error: queryError } = await adminClient
      .from("zpay_transactions")
      .select("*")
      .eq("out_trade_no", outTradeNo)
      .single();

    if (queryError || !transaction) {
      console.error("订单不存在:", queryError);
      return new NextResponse("fail", { status: 404 });
    }

    // 检查订单状态，避免重复处理
    if (transaction.payment_status === "success") {
      console.log("订单已处理，返回success");
      return new NextResponse("success", { status: 200 });
    }

    // 验证金额是否一致
    const transactionMoney = parseFloat(transaction.money);
    const receivedMoney = parseFloat(money);
    
    if (Math.abs(transactionMoney - receivedMoney) > 0.01) {
      console.error(
        `金额不一致: 订单金额=${transactionMoney}, 回调金额=${receivedMoney}`
      );
      return new NextResponse("fail", { status: 400 });
    }

    // 只有支付成功才更新订单状态
    if (tradeStatus === "TRADE_SUCCESS") {
      // 更新订单状态
      const { error: updateError } = await adminClient
        .from("zpay_transactions")
        .update({
          trade_no: tradeNo,
          payment_status: "success",
          paid_at: new Date().toISOString(),
        })
        .eq("out_trade_no", outTradeNo)
        .eq("payment_status", "pending"); // 确保只更新pending状态的订单

      if (updateError) {
        console.error("更新订单状态失败:", updateError);
        return new NextResponse("fail", { status: 500 });
      }

      // 如果是订阅产品，需要处理订阅时间
      if (transaction.is_subscription) {
        console.log(`处理订阅订单 ${outTradeNo}`);
        
        // 获取最新的订阅信息（包括当前订单的订阅时间）
        const { data: updatedTransaction } = await adminClient
          .from("zpay_transactions")
          .select("subscription_start_date, subscription_end_date")
          .eq("out_trade_no", outTradeNo)
          .single();
          
        if (updatedTransaction?.subscription_start_date && updatedTransaction?.subscription_end_date) {
          console.log(`订阅时间: ${updatedTransaction.subscription_start_date} 至 ${updatedTransaction.subscription_end_date}`);
          
          // 检查是否需要更新用户订阅状态
          // 这里可以根据业务需求添加更多逻辑，例如：
          // 1. 更新用户表中的订阅状态
          // 2. 发送订阅确认邮件
          // 3. 记录订阅变更日志
          
          // 示例：更新用户表中的订阅状态（如果存在user_subscriptions表）
          /*
          const { error: subscriptionUpdateError } = await adminClient
            .from("user_subscriptions")
            .upsert({
              user_id: transaction.user_id,
              subscription_start_date: updatedTransaction.subscription_start_date,
              subscription_end_date: updatedTransaction.subscription_end_date,
              updated_at: new Date().toISOString(),
            });
            
          if (subscriptionUpdateError) {
            console.error("更新用户订阅状态失败:", subscriptionUpdateError);
          } else {
            console.log("用户订阅状态更新成功");
          }
          */
        }
      }
      
      console.log(`订单 ${outTradeNo} 支付成功`);
      return new NextResponse("success", { status: 200 });
    } else {
      // 支付失败
      const { error: updateError } = await adminClient
        .from("zpay_transactions")
        .update({
          trade_no: tradeNo,
          payment_status: "failed",
        })
        .eq("out_trade_no", outTradeNo)
        .eq("payment_status", "pending");

      if (updateError) {
        console.error("更新订单状态失败:", updateError);
      }

      console.log(`订单 ${outTradeNo} 支付失败`);
      return new NextResponse("success", { status: 200 });
    }
  } catch (error) {
    console.error("处理webhook失败:", error);
    return new NextResponse("fail", { status: 500 });
  }
}

// 支持POST方法
export async function POST(request: NextRequest) {
  return GET(request);
}
