"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import SubscriptionInfo from "@/components/SubscriptionInfo";
import PurchaseHistory from "@/components/PurchaseHistory";

export default function DashboardInfo() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  // 只在仪表板页面显示
  if (pathname !== "/dashboard") {
    return null;
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 获取用户信息
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("获取用户信息失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [supabase]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有用户，不显示任何内容
  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-4 space-y-4 max-h-96 overflow-y-auto">
        <SubscriptionInfo />
        <PurchaseHistory user={user} />
      </div>
    </div>
  );
}