# ZPay PID 问题诊断

## 🔍 诊断结果

根据环境变量检测，发现以下情况：

```json
{
  "zpay": {
    "pid": true,
    "key": true,
    "pidPreview": "2025120321...",
    "pidLength": 16,
    "keyLength": 32
  }
}
```

## ⚠️ 发现的问题

### 问题 1: PID 长度不正确

- **您的 PID 长度**: 16 个字符
- **标准 PID 长度**: 21-24 个字符
- **您的 PID 预览**: `2025120321...`（看起来像日期格式）

**真实的 ZPay PID 示例**：

```
201901151314084206659771  (24位)
```

### 问题 2: PID 可能不是真实的商户 ID

您的 PID 以 `2025120321` 开头，这看起来像是：

- 日期时间戳（2025 年 12 月 03 日 21 时...）
- 而不是 ZPay 平台分配的真实商户 ID

## ✅ 解决方案

### 方案 1: 使用真实的 ZPay PID

1. **登录 ZPay 商户后台**：https://zpayz.cn
2. **找到您的商户信息**：

   - 进入"商户信息"或"API 配置"页面
   - 查找 **PID**（商户唯一标识）
   - 应该是一个 21-24 位的数字

3. **更新 .env.local**：

   ```env
   ZPAY_PID=201901151314084206659771  # 示例，使用您的真实 PID
   ZPAY_KEY=your_real_key_here
   ```

4. **重启开发服务器**：
   ```bash
   # Ctrl+C 停止
   npm run dev
   ```

### 方案 2: 如果您还没有 ZPay 账号

#### 选项 A: 注册 ZPay 账号

1. 访问 https://zpayz.cn
2. 注册商户账号
3. 获取真实的 PID 和 KEY

#### 选项 B: 使用模拟支付（开发测试）

如果暂时无法获取真实的 ZPay 账号，可以使用模拟支付进行开发：

**创建模拟支付 API**：

```bash
# 创建文件
mkdir -p app/api/checkout/providers/mock/url
```

**文件内容** (`app/api/checkout/providers/mock/url/route.ts`)：

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  createServerAdminClient,
  createServerSupabaseClient,
} from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    // 获取产品信息
    const productsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/products`
    );
    const productsData = await productsResponse.json();
    const product = productsData.products[productId];

    if (!product) {
      return NextResponse.json({ error: "产品不存在" }, { status: 404 });
    }

    // 生成模拟订单号
    const outTradeNo = `MOCK${Date.now()}`;

    // 创建订单记录
    const adminClient = createServerAdminClient();
    const { data: transaction } = await adminClient
      .from("zpay_transactions")
      .insert({
        user_id: user.id,
        out_trade_no: outTradeNo,
        product_id: productId,
        product_name: product.name,
        money: parseFloat(product.price),
        payment_type: "alipay",
        payment_status: "success", // 模拟直接成功
        is_subscription: product.isSubscription || false,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    // 直接跳转到成功页面
    const mockPaymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?mock=true`;

    return NextResponse.json({
      success: true,
      paymentUrl: mockPaymentUrl,
      outTradeNo,
      transaction,
      mock: true,
      message: "使用模拟支付，订单已自动标记为成功",
    });
  } catch (error) {
    console.error("模拟支付失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

**修改前端调用** (`components/pricing.tsx`)：

```typescript
// 临时使用模拟 API 进行开发测试
const response = await fetch("/api/checkout/providers/mock/url", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    productId,
    paymentType: "alipay",
  }),
});
```

## 🎯 快速检查清单

### 检查您的 PID 是否正确

- [ ] PID 长度是 21-24 位数字
- [ ] PID 不是日期时间格式
- [ ] PID 来自 ZPay 商户后台
- [ ] 在 ZPay 后台能找到这个 PID

### 验证步骤

1. **访问测试 API**：
   ```
   http://localhost:3000/api/test-env
   ```
2. **检查 PID 长度**：

   - 应该是 21-24 位
   - 不应该是 16 位

3. **测试支付**：
   - 点击购买按钮
   - 查看终端日志
   - 查看是否还有 "pid 错误" 提示

## 📝 .env.local 正确格式示例

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ZPay Payment Configuration
# ⚠️ 重要：PID 应该是 21-24 位数字，来自 ZPay 商户后台
ZPAY_PID=201901151314084206659771
ZPAY_KEY=your_32_character_merchant_key
```

## 🔧 调试命令

```bash
# 1. 检查环境变量
curl http://localhost:3000/api/test-env | python3 -m json.tool

# 2. 查看 PID 长度（应该是 21-24）
# 如果是 16，说明 PID 不正确

# 3. 重启开发服务器
# Ctrl+C 停止
npm run dev
```

## 💡 总结

**问题根源**：您的 `ZPAY_PID` 值不是真实的 ZPay 商户 ID。

**解决方法**：

1. 从 ZPay 商户后台获取真实的 PID（21-24 位数字）
2. 或使用模拟支付 API 进行开发测试

**下一步**：

- 如果有 ZPay 账号：更新 PID 为真实值
- 如果没有账号：使用上面的模拟支付方案
