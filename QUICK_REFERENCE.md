# ZPay 快速参考指南

## 🚀 快速开始（5 分钟设置）

### 1. 安装依赖（已完成）

```bash
# 项目已包含所需依赖
npm install
```

### 2. 配置环境变量

```bash
# 复制模板文件
cp .env.local.example .env.local

# 编辑 .env.local，填写以下信息：
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_BASE_URL
# - ZPAY_PID
# - ZPAY_KEY
```

### 3. 运行数据库迁移

```sql
-- 在 Supabase Dashboard > SQL Editor 执行
-- 复制 migrations/001_create_zpay_transactions.sql 的内容
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 测试支付流程

访问 `http://localhost:3000` → 定价页面 → 点击购买

---

## 📋 常用代码片段

### 前端：调用支付 API

```typescript
// 在任何组件中调用支付
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const handlePayment = async (productId: string) => {
  const supabase = createClient();
  const router = useRouter();

  // 检查登录
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    router.push("/signin");
    return;
  }

  // 调用支付 API
  const response = await fetch("/api/checkout/providers/zpay/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: "pro-monthly", // 或 "basic-onetime", "pro-yearly"
      paymentType: "alipay", // 或 "wxpay"
    }),
  });

  const data = await response.json();

  // 跳转支付
  if (data.success && data.paymentUrl) {
    window.location.href = data.paymentUrl;
  }
};
```

### 后端：查询用户订阅状态

```typescript
import { createServerAdminClient } from "@/utils/supabase/server";

// 查询用户当前有效订阅
async function getUserActiveSubscription(userId: string) {
  const adminClient = createServerAdminClient();

  const { data, error } = await adminClient
    .from("zpay_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_subscription", true)
    .eq("payment_status", "success")
    .gte("subscription_end_date", new Date().toISOString())
    .order("subscription_end_date", { ascending: false })
    .limit(1)
    .single();

  return data;
}
```

### 后端：查询用户所有交易记录

```typescript
import { createServerAdminClient } from "@/utils/supabase/server";

async function getUserTransactions(userId: string) {
  const adminClient = createServerAdminClient();

  const { data, error } = await adminClient
    .from("zpay_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return data;
}
```

### 后端：检查订单状态

```typescript
import { createServerAdminClient } from "@/utils/supabase/server";

async function checkOrderStatus(outTradeNo: string) {
  const adminClient = createServerAdminClient();

  const { data, error } = await adminClient
    .from("zpay_transactions")
    .select("*")
    .eq("out_trade_no", outTradeNo)
    .single();

  return data;
}
```

---

## 🔍 调试技巧

### 查看支付链接（不跳转）

```typescript
// 在 components/pricing.tsx 中临时修改
const data = await response.json();
console.log("支付链接:", data.paymentUrl);
// window.location.href = data.paymentUrl;  // 注释掉跳转
```

### 查看 Webhook 日志

```typescript
// 在 app/api/checkout/providers/zpay/webhook/route.ts 中
console.log("收到回调参数:", {
  pid,
  money,
  outTradeNo,
  tradeNo,
  tradeStatus,
});
```

### 测试签名生成

```typescript
const utility = require("utility");

const params = {
  pid: "test_pid",
  money: "10.00",
  name: "测试商品",
  out_trade_no: "20231203001",
  type: "alipay",
};

// 排序并拼接
const sorted = Object.keys(params)
  .sort()
  .map((key) => `${key}=${params[key]}`)
  .join("&");

console.log("参数串:", sorted);

const sign = utility.md5(sorted + "your_key");
console.log("签名:", sign);
```

---

## 📊 数据库查询示例

### 查看所有待支付订单

```sql
SELECT * FROM zpay_transactions
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

### 查看今日成功订单

```sql
SELECT * FROM zpay_transactions
WHERE payment_status = 'success'
  AND DATE(paid_at) = CURRENT_DATE
ORDER BY paid_at DESC;
```

### 查看用户订阅信息

```sql
SELECT
  user_id,
  product_id,
  subscription_start_date,
  subscription_end_date,
  payment_status
FROM zpay_transactions
WHERE is_subscription = true
  AND user_id = 'your-user-id'
ORDER BY subscription_end_date DESC;
```

### 统计收入

```sql
-- 今日收入
SELECT SUM(money) as total_revenue
FROM zpay_transactions
WHERE payment_status = 'success'
  AND DATE(paid_at) = CURRENT_DATE;

-- 本月收入
SELECT SUM(money) as total_revenue
FROM zpay_transactions
WHERE payment_status = 'success'
  AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE);
```

### 查看即将到期的订阅

```sql
SELECT
  user_id,
  product_id,
  subscription_end_date,
  EXTRACT(DAY FROM (subscription_end_date - NOW())) as days_remaining
FROM zpay_transactions
WHERE is_subscription = true
  AND payment_status = 'success'
  AND subscription_end_date > NOW()
  AND subscription_end_date < NOW() + INTERVAL '7 days'
ORDER BY subscription_end_date ASC;
```

---

## 🛠️ 常见问题快速解决

### 问题 1: 签名验证失败

**检查清单**:

```bash
# 1. 确认 ZPAY_KEY 正确
echo $ZPAY_KEY

# 2. 检查参数排序
# 参数必须按 ASCII 码排序（a-z）

# 3. 确认没有 URL 编码
# 参数值不要进行 URL 编码
```

### 问题 2: Webhook 未收到回调

**检查清单**:

```bash
# 1. 确认 URL 可公开访问
curl https://yourdomain.com/api/checkout/providers/zpay/webhook

# 2. 检查防火墙设置
# 确保允许 ZPay 的 IP 访问

# 3. 查看服务器日志
# 检查是否有错误日志
```

### 问题 3: 订单创建失败

**检查清单**:

```typescript
// 1. 确认用户已登录
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("用户:", user);

// 2. 确认产品存在
const response = await fetch("/api/products");
const data = await response.json();
console.log("产品列表:", data.products);

// 3. 检查数据库连接
// 确认 SUPABASE_SERVICE_ROLE_KEY 正确
```

### 问题 4: 金额验证失败

**原因**: 浮点数精度问题

**解决方案**:

```typescript
// 使用容差比较
const transactionMoney = parseFloat(transaction.money);
const receivedMoney = parseFloat(money);

if (Math.abs(transactionMoney - receivedMoney) > 0.01) {
  // 金额不一致
}
```

---

## 📱 本地测试 Webhook

### 使用 ngrok

```bash
# 1. 安装 ngrok
brew install ngrok  # macOS
# 或从 https://ngrok.com 下载

# 2. 启动 ngrok
ngrok http 3000

# 3. 复制 HTTPS URL
# 例如: https://abc123.ngrok.io

# 4. 更新 .env.local
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# 5. 重启开发服务器
npm run dev
```

### 使用 localtunnel

```bash
# 1. 安装 localtunnel
npm install -g localtunnel

# 2. 启动 tunnel
lt --port 3000

# 3. 使用返回的 URL
```

---

## 🎯 生产环境部署清单

- [ ] 更新 `NEXT_PUBLIC_BASE_URL` 为生产域名
- [ ] 在 ZPay 后台配置 Webhook URL
- [ ] 确认所有环境变量已设置
- [ ] 运行数据库迁移
- [ ] 测试支付流程
- [ ] 设置错误监控（如 Sentry）
- [ ] 配置日志收集
- [ ] 设置订阅到期提醒（可选）

---

## 📞 获取帮助

1. **查看文档**:

   - `ZPAY_INTEGRATION.md` - 完整集成文档
   - `IMPLEMENTATION_SUMMARY.md` - 实现总结
   - `PAYMENT_FLOW_DIAGRAM.md` - 流程图

2. **检查日志**:

   - 浏览器控制台
   - 服务器日志
   - Supabase 日志

3. **调试工具**:
   - Chrome DevTools (Network 标签)
   - Postman (测试 API)
   - Supabase Dashboard (查看数据)

---

**最后更新**: 2025-12-03
