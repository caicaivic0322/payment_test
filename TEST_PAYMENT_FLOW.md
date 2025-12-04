# 测试支付流程指南

## ✅ 正确的数据流程

### 步骤 1: 用户注册

**操作**: 访问 `/signup` 注册新用户

**预期结果**:

- ✅ `auth.users` 表中创建用户记录
- ❌ `zpay_transactions` 表中**不会**有记录（这是正常的！）

**验证 SQL**:

```sql
-- 查看注册的用户
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

### 步骤 2: 用户登录

**操作**: 访问 `/signin` 登录

**预期结果**:

- ✅ 用户成功登录
- ❌ `zpay_transactions` 表中仍然**不会**有记录

### 步骤 3: 访问定价页面

**操作**: 登录后访问定价页面（通常是首页或 `/pricing`）

**预期结果**:

- ✅ 看到产品列表
- ✅ 看到"购买"或"订阅"按钮
- ❌ `zpay_transactions` 表中仍然**不会**有记录

### 步骤 4: 点击购买按钮

**操作**: 点击"购买"或"订阅"按钮

**预期结果**:

- ✅ 前端调用 `/api/checkout/providers/zpay/url`
- ✅ **此时** `zpay_transactions` 表中创建记录（status: pending）
- ✅ 浏览器跳转到 ZPay 支付页面

**验证 SQL**:

```sql
-- 查看创建的订单
SELECT
  out_trade_no,
  user_id,
  product_id,
  money,
  payment_status,
  created_at
FROM zpay_transactions
ORDER BY created_at DESC
LIMIT 5;
```

### 步骤 5: 完成支付

**操作**: 在 ZPay 页面完成支付

**预期结果**:

- ✅ ZPay 调用 webhook
- ✅ 订单状态更新为 `success`
- ✅ 记录 `paid_at` 时间

**验证 SQL**:

```sql
-- 查看支付成功的订单
SELECT
  out_trade_no,
  trade_no,
  payment_status,
  paid_at
FROM zpay_transactions
WHERE payment_status = 'success'
ORDER BY paid_at DESC;
```

---

## 🧪 测试清单

### 测试 1: 检查用户是否注册成功

```sql
-- 在 Supabase Dashboard > SQL Editor 执行
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

**预期**: 应该看到您注册的用户

---

### 测试 2: 检查 zpay_transactions 表是否存在

```sql
-- 检查表是否创建
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'zpay_transactions';
```

**预期**: 应该返回一行记录

---

### 测试 3: 检查表结构

```sql
-- 查看表结构
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'zpay_transactions'
ORDER BY ordinal_position;
```

**预期**: 应该看到所有字段（id, user_id, out_trade_no, 等）

---

### 测试 4: 手动测试支付流程

#### 4.1 登录系统

1. 访问 `http://localhost:3000/signin`
2. 使用注册的账号登录

#### 4.2 访问定价页面

1. 访问首页或定价页面
2. 确认看到产品列表

#### 4.3 打开浏览器控制台

```
按 F12 或 Cmd+Option+I (Mac)
切换到 Console 标签
```

#### 4.4 点击购买按钮

1. 点击任意产品的"购买"或"订阅"按钮
2. 观察控制台输出

**预期控制台输出**:

```
获取产品信息
// ... 其他日志
```

**预期行为**:

- 如果未登录: 跳转到 `/signin`
- 如果已登录: 调用 API 并跳转到支付页面

#### 4.5 检查网络请求

在浏览器 DevTools > Network 标签中查看:

```
POST /api/checkout/providers/zpay/url
```

**预期响应**:

```json
{
  "success": true,
  "paymentUrl": "https://zpayz.cn/submit.php?...",
  "outTradeNo": "20231203...",
  "transaction": { ... }
}
```

#### 4.6 检查数据库

```sql
-- 查看是否创建了订单
SELECT * FROM zpay_transactions
ORDER BY created_at DESC
LIMIT 1;
```

**预期**: 应该看到刚创建的订单记录

---

## 🐛 常见问题排查

### 问题 1: 点击购买后没有反应

**可能原因**:

1. 用户未登录
2. API 调用失败
3. 环境变量未配置

**排查步骤**:

```javascript
// 在浏览器控制台执行
// 检查用户登录状态
const { createClient } = await import("/utils/supabase/client");
const supabase = createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("当前用户:", user);
```

### 问题 2: API 返回错误

**检查环境变量**:

```bash
# 确认以下环境变量已设置
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ZPAY_PID=...
ZPAY_KEY=...
```

**查看服务器日志**:

```bash
# 在运行 npm run dev 的终端中查看错误信息
```

### 问题 3: 数据库表不存在

**解决方案**:

1. 访问 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `migrations/001_create_zpay_transactions.sql` 的内容
4. 执行 SQL

---

## 📊 调试代码片段

### 在 pricing.tsx 中添加调试日志

```typescript
const handlePayment = async (productId: string) => {
  try {
    console.log("🔵 开始支付流程, productId:", productId);
    setLoading(true);

    // 检查用户是否登录
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("🔵 用户信息:", user);

    if (!user) {
      console.log("🔴 用户未登录，跳转到登录页");
      router.push("/signin");
      return;
    }

    console.log("🔵 调用支付 API...");
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

    console.log("🔵 API 响应状态:", response.status);
    const data = await response.json();
    console.log("🔵 API 响应数据:", data);

    if (!response.ok) {
      throw new Error(data.error || "获取支付链接失败");
    }

    if (data.success && data.paymentUrl) {
      console.log("🟢 支付链接生成成功:", data.paymentUrl);
      console.log("🟢 订单号:", data.outTradeNo);
      // window.location.href = data.paymentUrl;

      // 临时：不跳转，只显示链接
      alert("支付链接: " + data.paymentUrl);
    } else {
      throw new Error("支付链接无效");
    }
  } catch (error) {
    console.error("🔴 支付失败:", error);
    alert(error instanceof Error ? error.message : "支付失败，请重试");
  } finally {
    setLoading(false);
  }
};
```

---

## ✅ 验证成功的标志

当您完成一次完整的支付流程后，应该能看到：

### 1. 数据库中的记录

```sql
SELECT
  out_trade_no,
  user_id,
  product_id,
  product_name,
  money,
  payment_status,
  is_subscription,
  subscription_start_date,
  subscription_end_date,
  created_at
FROM zpay_transactions
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

### 2. 记录字段说明

- `out_trade_no`: 唯一订单号（如 20231203221530123）
- `user_id`: 您的用户 ID
- `product_id`: 产品 ID（如 pro-monthly）
- `payment_status`:
  - `pending`: 待支付
  - `success`: 支付成功
  - `failed`: 支付失败
- `is_subscription`: 是否为订阅
- `subscription_start_date`: 订阅开始时间（仅订阅产品）
- `subscription_end_date`: 订阅结束时间（仅订阅产品）

---

## 🎯 总结

**重要**: `zpay_transactions` 表只在用户**点击购买按钮**时才会创建记录，而不是在注册时。

**正确流程**:

1. 用户注册 → `auth.users` 表
2. 用户登录 → 无数据库变化
3. 用户点击购买 → `zpay_transactions` 表创建记录（pending）
4. 用户完成支付 → `zpay_transactions` 表更新状态（success）

如果您已经点击了购买按钮但数据库中仍然没有记录，请按照上面的调试步骤排查问题。
