"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("正在处理支付结果...");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const processPaymentResult = async () => {
      setIsUpdating(true);
      
      try {
        // 从URL参数中获取订单信息
        const outTradeNo = searchParams.get("out_trade_no");
        const tradeNo = searchParams.get("trade_no");
        
        if (outTradeNo) {
          // 调用API更新订单状态
          const response = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              out_trade_no: outTradeNo,
              trade_no: tradeNo,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setUpdateMessage("支付成功！您的订单已更新。");
              setIsSuccess(true);
            } else {
              setUpdateMessage("支付结果处理中，请稍后在个人中心查看。");
            }
          } else {
            setUpdateMessage("支付结果处理中，请稍后在个人中心查看。");
          }
        } else {
          setUpdateMessage("支付成功！感谢您的购买。");
          setIsSuccess(true);
        }
      } catch (error) {
        console.error("处理支付结果失败:", error);
        setUpdateMessage("支付成功！感谢您的购买。");
        setIsSuccess(true);
      } finally {
        setIsUpdating(false);
      }
    };

    // 延迟执行，给支付回调一些时间
    const timer = setTimeout(processPaymentResult, 1000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`mx-auto h-16 w-16 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-blue-100'} flex items-center justify-center ${isSuccess ? 'animate-pulse' : 'animate-spin'}`}>
            {isSuccess ? (
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            支付成功
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {updateMessage}
          </p>
        </div>
        
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            前往个人中心
          </Link>
        </div>
        
        {!isUpdating && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              如果您的订单状态未及时更新，请稍后刷新页面或联系客服
            </p>
          </div>
        )}
      </div>
    </div>
  );
}