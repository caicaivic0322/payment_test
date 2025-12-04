# ZPay 支付集成文档

本文档说明如何在项目中使用 ZPay 支付集成。

## 目录

1. [环境变量配置](#环境变量配置)
2. [数据库设置](#数据库设置)
3. [API 端点](#api-端点)
4. [使用流程](#使用流程)
5. [订阅逻辑说明](#订阅逻辑说明)
6. [安全性说明](#安全性说明)

## 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 应用基础URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # 开发环境
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # 生产环境

# ZPay 配置
ZPAY_PID=your_zpay_pid
ZPAY_KEY=your_zpay_key
```

### 环境变量说明

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 服务角色密钥（用于服务端操作）
- `NEXT_PUBLIC_BASE_URL`: 应用的基础 URL，用于构建回调地址
- `ZPAY_PID`: ZPay 商户 ID
- `ZPAY_KEY`: ZPay 商户密钥

## 数据库设置

### 1. 运行迁移脚本

在 Supabase SQL 编辑器中执行 `migrations/001_create_zpay_transactions.sql` 文件：

```bash
# 复制 SQL 文件内容到 Supabase Dashboard > SQL Editor
# 或使用 Supabase CLI
supabase db push
```

### 2. 表结构说明

`zpay_transactions` 表包含以下主要字段：

- `id`: 主键 (UUID)
- `user_id`: 用户 ID（关联 auth.users）
- `out_trade_no`: 商户订单号（唯一）
- `trade_no`: ZPay 订单号
- `product_id`: 产品 ID
- `product_name`: 商品名称
- `money`: 订单金额
- `payment_type`: 支付方式（alipay/wxpay）
- `payment_status`: 支付状态（pending/success/failed）
- `is_subscription`: 是否为订阅产品
- `subscription_period`: 订阅周期（monthly/yearly）
- `subscription_start_date`: 订阅开始时间
- `subscription_end_date`: 订阅结束时间
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `paid_at`: 支付完成时间

## API 端点

### 1. 获取支付链接

**端点**: `POST /api/checkout/providers/zpay/url`

**请求体**:

```json
{
  "productId": "pro-monthly",
  "paymentType": "alipay" // 可选: alipay 或 wxpay，默认 alipay
}
```

**响应**:

```json
{
  "success": true,
  "paymentUrl": "https://zpayz.cn/submit.php?...",
  "outTradeNo": "20231203221530123",
  "transaction": { ... }
}
```

**错误响应**:

```json
{
  "error": "错误信息"
}
```

### 2. 支付回调 Webhook

**端点**: `GET /api/checkout/providers/zpay/webhook`

**查询参数**:

- `pid`: 商户 ID
- `name`: 商品名称
- `money`: 订单金额
- `out_trade_no`: 商户订单号
- `trade_no`: ZPay 订单号
- `param`: 附加参数
- `trade_status`: 交易状态（TRADE_SUCCESS 表示成功）
- `type`: 支付方式
- `sign`: 签名
- `sign_type`: 签名类型

**响应**:

- 成功: `success` (HTTP 200)
- 失败: `fail` (HTTP 400/500)

## 使用流程

### 前端集成示例

```tsx
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const handlePayment = async (productId: string) => {
  const supabase = createClient();
  const router = useRouter();

  // 1. 检查用户登录状态
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.push("/signin");
    return;
  }

  // 2. 调用 API 获取支付链接
  const response = await fetch("/api/checkout/providers/zpay/url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      paymentType: "alipay",
    }),
  });

  const data = await response.json();

  // 3. 跳转到支付页面
  if (data.success && data.paymentUrl) {
    window.location.href = data.paymentUrl;
  }
};
```

### 完整支付流程

1. **用户点击购买按钮**

   - 前端检查用户登录状态
   - 未登录则跳转到登录页

2. **创建订单**

   - 调用 `/api/checkout/providers/zpay/url` 创建订单
   - 生成唯一订单号
   - 计算订阅时间（如果是订阅产品）
   - 保存订单到数据库（状态为 pending）

3. **跳转支付**

   - 前端接收支付链接
   - 跳转到 ZPay 支付页面

4. **用户完成支付**

   - 用户在 ZPay 页面完成支付
   - ZPay 调用 webhook 通知服务器

5. **处理回调**

   - 验证签名
   - 验证金额
   - 检查订单状态（防止重复处理）
   - 更新订单状态为 success
   - 返回 "success" 给 ZPay

6. **跳转成功页面**
   - 用户支付完成后跳转到 `/payment/success`
   - 显示支付成功信息

## 订阅逻辑说明

### 订阅续费计算

系统支持智能订阅续费，避免订阅时间重叠：

**场景 1: 首次订阅**

- 用户在 2025-03-15 订阅月付
- 开始时间: 2025-03-15
- 结束时间: 2025-04-15

**场景 2: 未过期续订**

- 用户在 2025-04-01 再次订阅月付（当前订阅 2025-04-15 过期）
- 开始时间: 2025-04-15（从上次过期时间开始）
- 结束时间: 2025-05-15

**场景 3: 过期后续订**

- 用户订阅已于 2025-04-15 过期
- 用户在 2025-05-01 重新订阅
- 开始时间: 2025-05-01（当前时间）
- 结束时间: 2025-06-01

### 实现代码

```typescript
function calculateSubscriptionDates(
  userId: string,
  period: "monthly" | "yearly",
  currentEndDate?: Date
): { startDate: Date; endDate: Date } {
  const now = new Date();

  // 如果用户已有订阅且未过期，从过期时间开始计算
  let startDate: Date;
  if (currentEndDate && currentEndDate > now) {
    startDate = new Date(currentEndDate);
  } else {
    startDate = now;
  }

  const endDate = new Date(startDate);
  if (period === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (period === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  return { startDate, endDate };
}
```

## 安全性说明

### 1. 签名验证

所有来自 ZPay 的回调都会进行签名验证：

```typescript
function verifySign(
  params: Record<string, any>,
  receivedSign: string
): boolean {
  const paramStr = getVerifyParams(params);
  const calculatedSign = utility.md5(paramStr + process.env.ZPAY_KEY);
  return calculatedSign === receivedSign;
}
```

### 2. 金额验证

防止金额篡改：

```typescript
const transactionMoney = parseFloat(transaction.money);
const receivedMoney = parseFloat(money);

if (Math.abs(transactionMoney - receivedMoney) > 0.01) {
  console.error("金额不一致");
  return new NextResponse("fail", { status: 400 });
}
```

### 3. 重复支付防护

使用数据库状态检查防止重复处理：

```typescript
if (transaction.payment_status === "success") {
  console.log("订单已处理，返回success");
  return new NextResponse("success", { status: 200 });
}
```

### 4. 使用服务角色密钥

所有数据库操作使用 `createServerAdminClient()`，绕过 RLS 策略：

```typescript
const adminClient = createServerAdminClient();
```

### 5. PID 验证

验证回调来源：

```typescript
if (pid !== process.env.ZPAY_PID) {
  console.error("PID不匹配");
  return new NextResponse("fail", { status: 400 });
}
```

## 测试

### 本地测试

1. 启动开发服务器：

```bash
npm run dev
```

2. 使用 ngrok 或类似工具暴露本地服务：

```bash
ngrok http 3000
```

3. 更新 `.env.local` 中的 `NEXT_PUBLIC_BASE_URL` 为 ngrok URL

4. 在 ZPay 后台配置回调地址：

```
https://your-ngrok-url.ngrok.io/api/checkout/providers/zpay/webhook
```

### 生产环境

1. 部署应用到生产环境
2. 更新环境变量
3. 在 ZPay 后台配置正式回调地址

## 常见问题

### Q: 订单创建成功但未收到回调？

A: 检查以下几点：

- Webhook URL 是否可公开访问
- 防火墙是否阻止了 ZPay 的请求
- 检查服务器日志是否有错误

### Q: 签名验证失败？

A: 确认：

- `ZPAY_KEY` 配置正确
- 参数排序逻辑与 ZPay 一致
- 没有对参数值进行 URL 编码

### Q: 如何处理订阅到期？

A: 可以创建定时任务检查 `subscription_end_date`，在到期前提醒用户续费。

## 支持

如有问题，请查看：

- [ZPay 官方文档](https://zpayz.cn)
- 项目 Issues
- 联系技术支持
