'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function TestPayment() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    
    getUser();
  }, [supabase]);

  const handlePayment = async (productId: string, paymentType: string = 'alipay') => {
    try {
      setPaymentLoading(true);
      
      const response = await fetch('/api/checkout/providers/zpay/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          paymentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取支付链接失败');
      }

      if (data.success && data.paymentUrl) {
        // 跳转到支付页面
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('支付链接无效');
      }
    } catch (error) {
      console.error('支付失败:', error);
      alert(error instanceof Error ? error.message : '支付失败，请重试');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">请先登录</h1>
        <Link href="/signin" className="btn text-white bg-blue-600 hover:bg-blue-700">
          登录
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-2">支付测试页面</h1>
      <p className="mb-6 text-gray-600">当前用户: {user.email}</p>
      
      <div className="w-full max-w-md space-y-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">基础版 (一次性)</h2>
          <p className="text-gray-600 mb-4">价格: ¥99</p>
          <button
            onClick={() => handlePayment('basic-onetime', 'alipay')}
            disabled={paymentLoading}
            className="w-full btn text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {paymentLoading ? '处理中...' : '支付宝购买'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">专业版 (月付)</h2>
          <p className="text-gray-600 mb-4">价格: ¥29/月</p>
          <button
            onClick={() => handlePayment('pro-monthly', 'alipay')}
            disabled={paymentLoading}
            className="w-full btn text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {paymentLoading ? '处理中...' : '支付宝订阅'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">专业版 (年付)</h2>
          <p className="text-gray-600 mb-4">价格: ¥299/年</p>
          <button
            onClick={() => handlePayment('pro-yearly', 'alipay')}
            disabled={paymentLoading}
            className="w-full btn text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {paymentLoading ? '处理中...' : '支付宝订阅'}
          </button>
        </div>
      </div>
      
      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          返回首页
        </Link>
      </div>
    </div>
  );
}