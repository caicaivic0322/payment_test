"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { getUserTransactions, getTransactionDetails } from "@/utils/zpay/subscription";

interface Transaction {
  id: string;
  out_trade_no: string;
  trade_no: string;
  product_id: string;
  product_name: string;
  money: number;
  payment_type: string;
  payment_status: string;
  is_subscription: boolean;
  subscription_period: string;
  subscription_start_date: string;
  subscription_end_date: string;
  created_at: string;
  paid_at: string;
  param: string;
}

interface PurchaseHistoryProps {
  user: User | null;
}

export default function PurchaseHistory({ user }: PurchaseHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const transactionData = await getUserTransactions(user.id);
        setTransactions(transactionData || []);
      } catch (error) {
        console.error("获取交易记录失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 格式化金额
  const formatMoney = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 获取支付状态文本
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待支付';
      case 'success':
        return '支付成功';
      case 'failed':
        return '支付失败';
      default:
        return '未知状态';
    }
  };

  // 获取支付状态样式
  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 处理操作按钮点击
  const handleActionClick = async (transaction: Transaction) => {
    if (transaction.payment_status === 'pending') {
      // 待支付状态，跳转到支付页面
      try {
        // 调用重新支付API
        const response = await fetch('/api/checkout/repay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: transaction.out_trade_no,
          }),
        });

        const data = await response.json();

        if (data.success && data.paymentUrl) {
          // 跳转到支付页面
          window.location.href = data.paymentUrl;
        } else {
          alert(data.error || "获取支付链接失败，请稍后再试");
        }
      } catch (error) {
        console.error("跳转支付失败:", error);
        alert("跳转支付失败，请稍后再试");
      }
    } else if (transaction.payment_status === 'success') {
      // 支付成功状态，显示订单详细信息
      try {
        const details = await getTransactionDetails(transaction.id);
        if (details) {
          const detailsText = `
订单号: ${details.out_trade_no}
交易号: ${details.trade_no || '暂无'}
产品名称: ${details.product_name}
产品ID: ${details.product_id}
订单金额: ${formatMoney(details.money)}
支付方式: ${details.payment_type === 'alipay' ? '支付宝' : '微信支付'}
支付状态: ${getPaymentStatusText(details.payment_status)}
创建时间: ${formatDate(details.created_at)}
支付时间: ${details.paid_at ? formatDate(details.paid_at) : '暂无'}
${details.is_subscription ? `
订阅类型: ${details.subscription_period === 'monthly' ? '月度订阅' : '年度订阅'}
订阅开始时间: ${details.subscription_start_date ? formatDate(details.subscription_start_date) : '暂无'}
订阅结束时间: ${details.subscription_end_date ? formatDate(details.subscription_end_date) : '暂无'}
` : ''}
附加信息: ${details.param || '无'}
          `.trim();
          
          alert(detailsText);
        } else {
          alert("获取订单详情失败");
        }
      } catch (error) {
        console.error("获取订单详情失败:", error);
        alert("获取订单详情失败，请稍后再试");
      }
    }
  };

  // 获取操作按钮文本
  const getActionButtonText = (status: string) => {
    switch (status) {
      case 'pending':
        return '去支付';
      case 'success':
        return '查看详情';
      case 'failed':
        return '重新购买';
      default:
        return '查看详情';
    }
  };

  // 获取操作按钮样式
  const getActionButtonClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'success':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'failed':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="h3 font-cabinet-grotesk mb-4">购买历史</h2>
        <div className="flex justify-center items-center py-8">
          <p className="text-gray-500">加载购买历史中...</p>
        </div>
      </div>
    );
  }

  // 没有交易记录
  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="h3 font-cabinet-grotesk mb-4">购买历史</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">您还没有任何购买记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="h3 font-cabinet-grotesk mb-4">购买历史</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                产品名称
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                购买日期
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                价格
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {transaction.product_name}
                  </div>
                  {transaction.is_subscription && (
                    <div className="text-sm text-gray-500">
                      {transaction.subscription_period === 'monthly' ? '月度订阅' : '年度订阅'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(transaction.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatMoney(transaction.money)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusClass(transaction.payment_status)}`}>
                    {getPaymentStatusText(transaction.payment_status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleActionClick(transaction)}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${getActionButtonClass(transaction.payment_status)} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {getActionButtonText(transaction.payment_status)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}