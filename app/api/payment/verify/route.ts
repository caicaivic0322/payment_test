import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { out_trade_no, trade_no } = await request.json();

    if (!out_trade_no) {
      return NextResponse.json(
        { success: false, error: "缺少订单号" },
        { status: 400 }
      );
    }

    // 使用管理员客户端查询交易记录
    const adminClient = createServerAdminClient();

    // 查询订单
    const { data: transaction, error: queryError } = await adminClient
      .from("zpay_transactions")
      .select("*")
      .eq("out_trade_no", out_trade_no)
      .single();

    if (queryError || !transaction) {
      console.error("订单不存在:", queryError);
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    // 如果订单已经是成功状态，直接返回成功
    if (transaction.payment_status === "success") {
      return NextResponse.json({
        success: true,
        status: "success",
        message: "订单已支付成功",
        data: {
          payment_status: transaction.payment_status,
          paid_at: transaction.paid_at,
        },
      });
    }

    // 如果订单状态是待支付，尝试查询ZPay获取最新状态
    if (transaction.payment_status === "pending") {
      try {
        // 调用ZPay查询接口
        const zpayQueryUrl = `https://api.zpay.dev/query?pid=${process.env.ZPAY_PID}&out_trade_no=${out_trade_no}`;
        
        const response = await fetch(zpayQueryUrl);
        const queryData = await response.json();

        if (queryData.code === 200 && queryData.data) {
          const { trade_status, trade_no: zpayTradeNo } = queryData.data;

          // 如果ZPay返回支付成功，更新本地订单状态
          if (trade_status === "TRADE_SUCCESS") {
            const { error: updateError } = await adminClient
              .from("zpay_transactions")
              .update({
                trade_no: zpayTradeNo || trade_no,
                payment_status: "success",
                paid_at: new Date().toISOString(),
              })
              .eq("out_trade_no", out_trade_no)
              .eq("payment_status", "pending");

            if (updateError) {
              console.error("更新订单状态失败:", updateError);
              return NextResponse.json(
                { success: false, error: "更新订单状态失败" },
                { status: 500 }
              );
            }

            return NextResponse.json({
              success: true,
              status: "success",
              message: "订单状态已更新为支付成功",
              data: {
                payment_status: "success",
                paid_at: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        console.error("查询ZPay状态失败:", error);
      }
    }

    // 返回当前订单状态
    return NextResponse.json({
      success: true,
      status: transaction.payment_status,
      message: "订单状态未变化",
      data: {
        payment_status: transaction.payment_status,
        created_at: transaction.created_at,
      },
    });
  } catch (error) {
    console.error("验证支付状态失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}