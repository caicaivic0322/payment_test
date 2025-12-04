"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { getUserSubscription } from "@/utils/zpay/subscription";

interface SubscriptionInfo {
  id: string;
  product_id: string;
  product_name: string;
  subscription_period: string;
  subscription_start_date: string;
  subscription_end_date: string;
  payment_status: string;
}

export default function SubscriptionInfo() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndSubscription = async () => {
      try {
        // 获取用户信息
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUser(user);
        
        // 获取用户订阅信息
        const subscriptionData = await getUserSubscription(user.id);
        setSubscription(subscriptionData);
      } catch (error) {
        console.error("获取用户订阅信息失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSubscription();
  }, [supabase]);

  // 如果没有用户或订阅信息，不显示任何内容
  if (!user || !subscription) {
    return null;
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 检查订阅是否有效
  const isSubscriptionActive = () => {
    if (!subscription.subscription_end_date) return false;
    return new Date(subscription.subscription_end_date) > new Date();
  };

  // 获取订阅状态文本
  const getSubscriptionStatusText = () => {
    if (!isSubscriptionActive()) return "已过期";
    return "有效";
  };

  // 获取订阅状态样式
  const getSubscriptionStatusClass = () => {
    if (!isSubscriptionActive()) return "bg-red-100 text-red-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            <span className="font-medium">订阅状态:</span>
            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSubscriptionStatusClass()}`}>
              {getSubscriptionStatusText()}
            </span>
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <span className="font-medium">订阅产品:</span> {subscription.product_name}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <span className="font-medium">订阅周期:</span> {subscription.subscription_period === 'monthly' ? '月度' : '年度'}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <span className="font-medium">订阅期限:</span> {formatDate(subscription.subscription_start_date)} 至 {formatDate(subscription.subscription_end_date)}
          </p>
        </div>
      </div>
    </div>
  );
}