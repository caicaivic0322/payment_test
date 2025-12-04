import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient, createServerSupabaseClient } from "@/utils/supabase/server";

// 模拟支付 API - 用于开发测试
export async function POST(request: NextRequest) {
  try {
    console.log('=== 模拟支付请求 ===');
    console.log('时间:', new Date().toISOString());
    
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

    console.log('用户ID:', user.id);

    // 解析请求体
    const body = await request.json();
    const { productId, paymentType = "alipay" } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "缺少产品ID" },
        { status: 400 }
      );
    }

    console.log('产品ID:', productId);

    // 直接使用产品数据，避免依赖外部 API 调用
    const products: Record<string, any> = {
      "basic-onetime": {
        id: "basic-onetime",
        name: "基础版AI编程教程",
        title: "基础版",
        description: "探索入门教程，学习AI编程基础知识，参与社区讨论。",
        price: "0.1",
        priceLabel: "/一次性",
        isSubscription: false,
        features: [
          { id: "basic-1", text: "基础入门视频教程" },
          { id: "basic-2", text: "社区讨论区交流" },
          { id: "basic-3", text: "AI开发工具介绍" },
          { id: "basic-4", text: "编程环境搭建指南" },
        ],
      },
      "pro-monthly": {
        id: "pro-monthly",
        name: "专业版AI编程教程 (月付)",
        title: "专业版",
        description: "获得完整课程内容和项目源码，一年内享受专业答疑服务。",
        price: "0.1",
        priceLabel: "/月",
        isSubscription: true,
        subscriptionPeriod: "monthly",
        features: [
          { id: "pro-1", text: "进阶课程和视频教程" },
          { id: "pro-2", text: "20+实战项目源码" },
          { id: "pro-3", text: "一年专属群内答疑服务" },
          { id: "pro-4", text: "项目实战指导" },
          { id: "pro-5", text: "产品创意分享与推广机会" },
        ],
      },
      "pro-yearly": {
        id: "pro-yearly",
        name: "专业版AI编程教程 (年付)",
        title: "专业版",
        description: "获得完整课程内容和项目源码，一年内享受专业答疑服务。",
        price: "1",
        priceLabel: "/年",
        isSubscription: true,
        subscriptionPeriod: "yearly",
        features: [
          { id: "pro-1", text: "进阶课程和视频教程" },
          { id: "pro-2", text: "20+实战项目源码" },
          { id: "pro-3", text: "一年专属群内答疑服务" },
          { id: "pro-4", text: "项目实战指导" },
          { id: "pro-5", text: "产品创意分享与推广机会" },
        ],
      },
    };
    
    const product = products[productId];

    if (!product) {
      return NextResponse.json(
        { error: "产品不存在" },
        { status: 404 }
      );
    }

    console.log('产品信息:', product.name, product.price);

    // 生成模拟订单号
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const outTradeNo = `MOCK${year}${month}${day}${hour}${minute}${second}${random}`;

    console.log('订单号:', outTradeNo);

    // 准备订阅信息
    let subscriptionStartDate: Date | null = null;
    let subscriptionEndDate: Date | null = null;

    if (product.isSubscription) {
      // 检查用户是否已有订阅（与真实支付API保持一致）
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
      
      // 计算新订阅时间（与真实支付API保持一致）
      let startDate: Date;
      if (currentEndDate && currentEndDate > now) {
        startDate = new Date(currentEndDate);
        console.log(`用户已有订阅，新订阅将从 ${startDate.toISOString()} 开始`);
      } else {
        startDate = now;
        console.log(`用户无有效订阅，新订阅将从 ${startDate.toISOString()} 开始`);
      }
      
      const endDate = new Date(startDate);
      if (product.subscriptionPeriod === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
        console.log(`月付订阅，结束时间: ${endDate.toISOString()}`);
      } else if (product.subscriptionPeriod === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
        console.log(`年付订阅，结束时间: ${endDate.toISOString()}`);
      }
      
      subscriptionStartDate = startDate;
      subscriptionEndDate = endDate;

      console.log('订阅信息:', {
        period: product.subscriptionPeriod,
        start: subscriptionStartDate,
        end: subscriptionEndDate,
      });
    }

    // 创建交易记录（模拟支付直接标记为成功）
    const adminClient = createServerAdminClient();
    const { data: transaction, error: insertError } = await adminClient
      .from("zpay_transactions")
      .insert({
        user_id: user.id,
        out_trade_no: outTradeNo,
        trade_no: `ZPAY_MOCK_${outTradeNo}`,
        product_id: productId,
        product_name: product.name,
        money: parseFloat(product.price),
        payment_type: paymentType,
        payment_status: "success", // 模拟直接成功
        is_subscription: product.isSubscription || false,
        subscription_period: product.subscriptionPeriod || null,
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        param: JSON.stringify({ userId: user.id, productId, mock: true }),
        paid_at: new Date().toISOString(),
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

    console.log('✅ 模拟支付成功，订单已创建');

    // 直接跳转到成功页面（模拟支付无需跳转到支付网关）
    // 使用请求头获取基础 URL，确保在 Vercel 环境中正确
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    
    const mockPaymentUrl = `${baseUrl}/payment/success?mock=true&out_trade_no=${outTradeNo}`;
    
    console.log(`模拟支付URL: ${mockPaymentUrl}`);

    return NextResponse.json({
      success: true,
      paymentUrl: mockPaymentUrl,
      outTradeNo,
      transaction,
      mock: true,
      message: "🎭 使用模拟支付，订单已自动标记为成功",
    });
  } catch (error) {
    console.error("模拟支付失败:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
