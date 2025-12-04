# 🚀 快速修复 "pid 错误，未找到对应商家" 问题

## ❌ 错误原因

您看到这个错误是因为 **ZPay 商户 ID (PID) 未正确配置**。

## ✅ 立即修复（3 步）

### 步骤 1: 停止开发服务器

在运行 `npm run dev` 的终端中按 `Ctrl+C` 停止服务器。

### 步骤 2: 配置环境变量

编辑项目根目录的 `.env.local` 文件：

```env
# ZPay Payment Configuration
ZPAY_PID=your_zpay_merchant_id_here
ZPAY_KEY=your_zpay_merchant_key_here
```

**重要**：

- 将 `your_zpay_merchant_id_here` 替换为您的真实 ZPay 商户 ID
- 将 `your_zpay_merchant_key_here` 替换为您的真实 ZPay 商户密钥

### 步骤 3: 重启开发服务器

```bash
npm run dev
```

---

## 🔑 如何获取 ZPay PID 和 KEY

### 如果您已有 ZPay 账号：

1. 登录 ZPay 商户后台：https://zpayz.cn
2. 进入"商户信息"或"API 配置"页面
3. 复制您的 **PID**（商户唯一标识）
4. 复制您的 **KEY**（商户密钥）

### 如果您还没有 ZPay 账号：

1. 访问 https://zpayz.cn
2. 点击"注册"
3. 完成商户注册流程
4. 登录后获取 PID 和 KEY

---

## 🧪 验证配置是否正确

### 方法 1: 使用测试 API

访问以下 URL 检查环境变量状态：

```
http://localhost:3000/api/test-env
```

您应该看到类似这样的响应：

```json
{
  "supabase": {
    "url": true,
    "anonKey": true,
    "serviceRoleKey": true
  },
  "app": {
    "baseUrl": true,
    "baseUrlValue": "http://localhost:3000"
  },
  "zpay": {
    "pid": true, // ✅ 应该是 true
    "key": true, // ✅ 应该是 true
    "pidPreview": "2019011513...",
    "pidLength": 24,
    "keyLength": 32
  },
  "allConfigured": true // ✅ 应该是 true
}
```

### 方法 2: 查看终端日志

重启服务器后，点击支付按钮，查看终端输出：

```
=== ZPay 支付请求 ===
时间: 2025-12-03T15:03:04.000Z
环境变量状态:
  - ZPAY_PID: 2019011513... (长度: 24)  ✅
  - ZPAY_KEY: 已设置 (长度: 32)         ✅
  - BASE_URL: http://localhost:3000     ✅
✅ 环境变量验证通过
```

如果看到 `❌ 未设置`，说明环境变量没有正确加载。

---

## 🛠️ 开发测试方案（暂时没有 ZPay 账号）

如果您暂时无法获取 ZPay 账号，可以使用模拟模式：

### 创建模拟支付 API

创建文件 `app/api/checkout/providers/mock/url/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/utils/supabase/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

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
        product_name: "测试产品",
        money: 0.01,
        payment_type: "alipay",
        payment_status: "pending",
      })
      .select()
      .single();

    // 返回模拟支付链接（直接跳转到成功页面）
    const mockPaymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?mock=true`;

    return NextResponse.json({
      success: true,
      paymentUrl: mockPaymentUrl,
      outTradeNo,
      transaction,
      mock: true,
    });
  } catch (error) {
    console.error("模拟支付失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

### 修改前端调用

在 `components/pricing.tsx` 中，临时修改 API 端点：

```typescript
// 临时使用模拟 API
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

---

## 📋 完整的 .env.local 示例

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ZPay Payment Configuration
ZPAY_PID=201901151314084206659771
ZPAY_KEY=your_32_character_key_here
```

---

## ⚠️ 重要提示

1. **修改 .env.local 后必须重启服务器**
2. **不要将 .env.local 提交到 Git**（已在 .gitignore 中）
3. **生产环境使用真实的 PID 和 KEY**
4. **不要在代码中硬编码密钥**

---

## 🎯 检查清单

- [ ] `.env.local` 文件存在于项目根目录
- [ ] `ZPAY_PID` 已设置为真实的商户 ID
- [ ] `ZPAY_KEY` 已设置为真实的商户密钥
- [ ] 已停止并重启开发服务器
- [ ] 访问 `/api/test-env` 确认配置正确
- [ ] 点击支付按钮测试

---

## 📞 仍然有问题？

1. **查看终端日志**：确认环境变量是否正确加载
2. **检查 ZPay 后台**：确认 PID 和 KEY 正确
3. **使用模拟模式**：暂时绕过 ZPay 进行开发
4. **查看文档**：`ZPAY_ERROR_TROUBLESHOOTING.md`

---

**快速链接**：

- 测试环境变量：http://localhost:3000/api/test-env
- 系统测试页面：http://localhost:3000/system-test
- ZPay 官网：https://zpayz.cn
