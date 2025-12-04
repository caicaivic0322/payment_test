"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface SystemStatus {
  userLoggedIn: boolean;
  userEmail: string | null;
  userId: string | null;
  supabaseConnected: boolean;
  error: string | null;
}

export default function SystemTestPage() {
  const [status, setStatus] = useState<SystemStatus>({
    userLoggedIn: false,
    userEmail: null,
    userId: null,
    supabaseConnected: false,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 检查 Supabase 连接
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        setStatus({
          userLoggedIn: false,
          userEmail: null,
          userId: null,
          supabaseConnected: false,
          error: error.message,
        });
      } else {
        setStatus({
          userLoggedIn: !!user,
          userEmail: user?.email || null,
          userId: user?.id || null,
          supabaseConnected: true,
          error: null,
        });
      }
    } catch (error: any) {
      setStatus({
        userLoggedIn: false,
        userEmail: null,
        userId: null,
        supabaseConnected: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const testPaymentAPI = async () => {
    if (!status.userLoggedIn) {
      alert("请先登录！");
      return;
    }

    try {
      const response = await fetch("/api/checkout/providers/zpay/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: "pro-monthly",
          paymentType: "alipay",
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ 支付 API 测试成功！\n\n订单号: ${data.outTradeNo}\n\n支付链接已生成（查看控制台）`);
        console.log("支付链接:", data.paymentUrl);
        console.log("完整响应:", data);
      } else {
        alert(`❌ 支付 API 测试失败：${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ 请求失败：${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检测系统状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            系统状态检测
          </h1>
          <p className="text-gray-600">
            检查用户认证和支付系统是否正常工作
          </p>
        </div>

        {/* 系统状态卡片 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            系统状态
          </h2>

          <div className="space-y-3">
            {/* Supabase 连接状态 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">Supabase 连接</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status.supabaseConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {status.supabaseConnected ? "✅ 已连接" : "❌ 未连接"}
              </span>
            </div>

            {/* 用户登录状态 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">用户登录状态</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status.userLoggedIn
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {status.userLoggedIn ? "✅ 已登录" : "⚠️ 未登录"}
              </span>
            </div>

            {/* 用户信息 */}
            {status.userLoggedIn && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">用户邮箱</span>
                  <span className="text-gray-700">{status.userEmail}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">用户 ID</span>
                  <span className="text-gray-700 text-xs font-mono">
                    {status.userId}
                  </span>
                </div>
              </>
            )}

            {/* 错误信息 */}
            {status.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">
                  <strong>错误：</strong> {status.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            快速操作
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!status.userLoggedIn ? (
              <>
                <Link
                  href="/signup"
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  注册新账号
                </Link>
                <Link
                  href="/signin"
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  登录账号
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={testPaymentAPI}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  测试支付 API
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  返回首页
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 说明文档 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📚 使用说明
          </h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start">
              <span className="mr-2">1️⃣</span>
              <span>
                <strong>注册账号</strong>：点击"注册新账号"创建用户，数据将保存到 auth.users 表
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2️⃣</span>
              <span>
                <strong>登录系统</strong>：使用注册的邮箱和密码登录
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3️⃣</span>
              <span>
                <strong>测试支付</strong>：登录后点击"测试支付 API"，将在 zpay_transactions 表中创建订单
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4️⃣</span>
              <span>
                <strong>查看数据</strong>：在 Supabase Dashboard 中查看 auth.users 和 zpay_transactions 表
              </span>
            </li>
          </ul>
        </div>

        {/* 刷新按钮 */}
        <div className="mt-6 text-center">
          <button
            onClick={checkSystemStatus}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            刷新状态
          </button>
        </div>
      </div>
    </div>
  );
}
