"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// 产品特性接口
interface ProductFeature {
  id: string;
  text: string;
}

// 产品类型定义
interface Product {
  id: string;
  name: string;
  title: string;
  description: string;
  price: string;
  priceLabel: string;
  isSubscription: boolean;
  subscriptionPeriod?: string;
  features: ProductFeature[];
}

export default function Pricing() {
  const [annual, setAnnual] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const supabase = createClient();

  // 获取产品信息
  useEffect(() => {
    const fetchProducts = async () => {
      console.log("获取产品信息");
      try {
        const response = await fetch("/api/products");
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error("获取产品信息失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 处理支付请求
  const handlePayment = async (productId: string) => {
    try {
      setLoading(true);

      // 检查用户是否登录
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // 未登录，跳转到登录页
        router.push("/signin");
        return;
      }

      // 决定使用真实支付还是模拟支付
      // 如果环境变量中设置了 USE_MOCK_PAYMENT=true，或者在开发环境下可以使用模拟支付
      // 默认使用模拟支付，除非明确设置为 false
      const useMockPayment = process.env.NEXT_PUBLIC_USE_MOCK_PAYMENT !== 'false';
      const apiEndpoint = useMockPayment 
        ? "/api/checkout/providers/mock/url"
        : "/api/checkout/providers/zpay/url";

      console.log(`使用${useMockPayment ? '模拟' : '真实'}支付 API:`, apiEndpoint);

      // 调用API获取支付链接
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          paymentType: "alipay", // 默认使用支付宝，可以根据需要修改
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取支付链接失败");
      }

      if (data.success && data.paymentUrl) {
        // 如果是模拟支付，显示提示
        if (data.mock) {
          console.log('🎭 模拟支付模式:', data.message);
        }
        
        // 跳转到支付页面
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("支付链接无效");
      }
    } catch (error) {
      console.error("支付失败:", error);
      alert(error instanceof Error ? error.message : "支付失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 显示加载状态
  if (isLoading) {
    return (
      <section className="relative border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="py-12 md:py-20 text-center">
            <p>加载产品信息中...</p>
          </div>
        </div>
      </section>
    );
  }

  // 获取基础版产品
  const basicProduct = products["basic-onetime"];

  // 获取当前选择的专业版产品（年付或月付）
  const proProduct = annual ? products["pro-yearly"] : products["pro-monthly"];

  return (
    <section className="relative border-t border-gray-100">
      {/* Bg gradient */}
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-50 to-white h-1/2 pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-16">
            <h2 className="h2 font-cabinet-grotesk">
              加入AI编程，开启你的AI之旅
            </h2>
          </div>
          {/* Pricing tables */}
          <div>
            {/* Pricing toggle */}
            <div className="flex justify-center max-w-[18rem] m-auto mb-8 lg:mb-16">
              <div className="relative flex w-full mx-6 p-1 bg-gray-200 rounded-full">
                <span
                  className="absolute inset-0 m-1 pointer-events-none"
                  aria-hidden="true"
                >
                  <span
                    className={`absolute inset-0 w-1/2 bg-white rounded-full shadow transform transition duration-150 ease-in-out ${
                      annual ? "translate-x-0" : "translate-x-full"
                    }`}
                  />
                </span>
                <button
                  className={`relative flex-1 text-sm font-medium p-1 transition duration-150 ease-in-out ${
                    annual && "text-gray-500"
                  }`}
                  onClick={() => setAnnual(true)}
                >
                  年付
                </button>
                <button
                  className={`relative flex-1 text-sm font-medium p-1 transition duration-150 ease-in-out ${
                    annual && "text-gray-500"
                  }`}
                  onClick={() => setAnnual(false)}
                >
                  月付
                </button>
              </div>
            </div>
            <div className="max-w-sm mx-auto grid gap-8 lg:grid-cols-2 lg:gap-6 items-start lg:max-w-3xl pt-4">
              {/* Pricing table 1 - 基础版 */}
              {basicProduct && (
                <div
                  className="relative flex flex-col h-full p-6"
                  data-aos="fade-right"
                >
                  <div className="mb-6">
                    <div className="font-cabinet-grotesk text-xl font-semibold mb-1">
                      {basicProduct.title}
                    </div>
                    <div className="font-cabinet-grotesk inline-flex items-baseline mb-2">
                      <span className="text-3xl font-medium">¥</span>
                      <span className="text-5xl font-bold">
                        {basicProduct.price}
                      </span>
                      <span className="font-medium">
                        {basicProduct.priceLabel}
                      </span>
                    </div>
                    <div className="text-gray-500 mb-6">
                      {basicProduct.description}
                    </div>
                    <button
                      className="btn text-white bg-blue-600 hover:bg-blue-700 w-full shadow-sm"
                      onClick={() => handlePayment("basic-onetime")}
                      disabled={loading}
                    >
                      {loading ? "处理中..." : "购买"}
                    </button>
                  </div>
                  <div className="font-medium mb-4">包含以下内容：</div>
                  <ul className="text-gray-500 space-y-3 grow">
                    {basicProduct.features.map((feature) => (
                      <li key={feature.id} className="flex items-center">
                        <svg
                          className="w-3 h-3 fill-current text-emerald-500 mr-3 shrink-0"
                          viewBox="0 0 12 12"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pricing table 2 - 专业版 */}
              {proProduct && (
                <div
                  className="relative flex flex-col h-full p-6 bg-gray-800"
                  data-aos="fade-left"
                >
                  <div className="absolute top-0 right-0 mr-6 -mt-4">
                    <div className="inline-flex items-center text-sm font-semibold py-1 px-4 text-emerald-600 bg-emerald-200 rounded-full">
                      最受欢迎
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="font-cabinet-grotesk text-xl text-gray-100 font-semibold mb-1">
                      {proProduct.title}
                    </div>
                    <div className="font-cabinet-grotesk text-gray-100 inline-flex items-baseline mb-2">
                      <span className="text-3xl font-medium text-gray-400">
                        ¥
                      </span>
                      <span className="text-5xl font-bold">
                        {proProduct.price}
                      </span>
                      <span className="font-medium text-gray-400">
                        {proProduct.priceLabel}
                      </span>
                    </div>
                    <div className="text-gray-400 mb-6">
                      {proProduct.description}
                    </div>
                    <button
                      className="btn text-white bg-blue-600 hover:bg-blue-700 w-full shadow-sm"
                      onClick={() =>
                        handlePayment(annual ? "pro-yearly" : "pro-monthly")
                      }
                      disabled={loading}
                    >
                      {loading ? "处理中..." : "订阅"}
                    </button>
                  </div>
                  <div className="font-medium text-gray-100 mb-4">
                    基础版全部内容，外加：
                  </div>
                  <ul className="text-gray-400 space-y-3 grow">
                    {proProduct.features.map((feature) => (
                      <li key={feature.id} className="flex items-center">
                        <svg
                          className="w-3 h-3 fill-current text-emerald-500 mr-3 shrink-0"
                          viewBox="0 0 12 12"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
