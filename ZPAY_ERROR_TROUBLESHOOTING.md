# ZPay 支付错误排查指南

## ❌ 错误信息

```json
{ "code": "error", "msg": "pid错误，未找到对应商家" }
```

## 🔍 问题原因

这个错误表示 ZPay 平台无法识别您提供的商户 ID（PID）。可能的原因：

1. ✅ **环境变量未设置**：`.env.local` 中没有配置 `ZPAY_PID`
2. ✅ **PID 错误**：配置的 PID 不正确或不存在
3. ✅ **环境变量未生效**：修改后未重启开发服务器

---

## 🛠️ 解决方案

### 步骤 1: 检查环境变量

打开 `.env.local` 文件，确认以下配置：

```env
# ZPay 配置
ZPAY_PID=your_actual_zpay_pid_here
ZPAY_KEY=your_actual_zpay_key_here
```

**重要**：

- 将 `your_actual_zpay_pid_here` 替换为您在 ZPay 平台注册的真实商户 ID
- 将 `your_actual_zpay_key_here` 替换为您的真实商户密钥

### 步骤 2: 获取 ZPay 商户信息

如果您还没有 ZPay 账号：

1. **访问 ZPay 官网**：https://zpayz.cn
2. **注册商户账号**
3. **登录后台**，获取：
   - **PID**（商户唯一标识）
   - **KEY**（商户密钥）

### 步骤 3: 更新环境变量

编辑 `.env.local` 文件：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ZPay Payment Configuration
ZPAY_PID=201901151314084206659771  # 示例，请替换为您的真实 PID
ZPAY_KEY=your_real_zpay_key_here   # 示例，请替换为您的真实 KEY
```

### 步骤 4: 重启开发服务器

**重要**：修改 `.env.local` 后必须重启开发服务器！

```bash
# 1. 停止当前服务器（按 Ctrl+C）

# 2. 重新启动
npm run dev
```

---

## 🧪 测试环境变量是否生效

### 方法 1: 在 API 中添加日志

临时修改 `app/api/checkout/providers/zpay/url/route.ts`：

```typescript
export async function POST(request: NextRequest) {
  try {
    // 添加调试日志
    console.log('🔍 环境变量检查:');
    console.log('ZPAY_PID:', process.env.ZPAY_PID);
    console.log('ZPAY_KEY:', process.env.ZPAY_KEY ? '已设置' : '未设置');
    console.log('BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

    // ... 其余代码
```

重启服务器后，点击支付按钮，查看终端输出。

### 方法 2: 创建测试 API

创建一个简单的测试端点来验证环境变量：

```typescript
// app/api/test-env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    zpay_pid_set: !!process.env.ZPAY_PID,
    zpay_key_set: !!process.env.ZPAY_KEY,
    base_url: process.env.NEXT_PUBLIC_BASE_URL,
    // 不要在生产环境暴露真实的 PID 和 KEY
    zpay_pid_preview: process.env.ZPAY_PID?.substring(0, 10) + "...",
  });
}
```

访问 `http://localhost:3000/api/test-env` 查看结果。

---

## 🎯 临时测试方案（开发环境）

如果您暂时没有 ZPay 账号，可以使用以下方式进行开发测试：

### 选项 1: 使用模拟模式

修改支付 API，添加开发模式：

```typescript
// app/api/checkout/providers/zpay/url/route.ts

const isDevelopment = process.env.NODE_ENV === "development";
const useMockPayment = process.env.USE_MOCK_PAYMENT === "true";

if (isDevelopment && useMockPayment) {
  // 模拟支付链接
  const mockPaymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?mock=true&out_trade_no=${outTradeNo}`;

  return NextResponse.json({
    success: true,
    paymentUrl: mockPaymentUrl,
    outTradeNo,
    transaction,
    mock: true,
  });
}
```

在 `.env.local` 中添加：

```env
USE_MOCK_PAYMENT=true
```

### 选项 2: 注册 ZPay 测试账号

大多数支付平台都提供沙箱/测试环境，您可以：

1. 联系 ZPay 客服获取测试账号
2. 或注册正式账号用于开发测试

---

## 📋 完整的环境变量检查清单

### 必需的环境变量

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- [ ] `NEXT_PUBLIC_BASE_URL` - 应用基础 URL
- [ ] `ZPAY_PID` - ZPay 商户 ID ⚠️ **必须是真实有效的**
- [ ] `ZPAY_KEY` - ZPay 商户密钥 ⚠️ **必须是真实有效的**

### 验证步骤

```bash
# 1. 检查 .env.local 文件是否存在
ls -la .env.local

# 2. 查看文件内容（注意不要泄露密钥）
cat .env.local | grep ZPAY

# 3. 重启开发服务器
# Ctrl+C 停止
npm run dev
```

---

## 🔧 调试代码

将以下代码添加到支付 API 中进行调试：

```typescript
// app/api/checkout/providers/zpay/url/route.ts

export async function POST(request: NextRequest) {
  try {
    // === 调试信息开始 ===
    console.log('=== ZPay 支付请求调试 ===');
    console.log('时间:', new Date().toISOString());
    console.log('环境变量状态:');
    console.log('  - ZPAY_PID:', process.env.ZPAY_PID ?
      `${process.env.ZPAY_PID.substring(0, 10)}... (长度: ${process.env.ZPAY_PID.length})` :
      '❌ 未设置');
    console.log('  - ZPAY_KEY:', process.env.ZPAY_KEY ?
      `已设置 (长度: ${process.env.ZPAY_KEY.length})` :
      '❌ 未设置');
    console.log('  - BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

    // 检查必需的环境变量
    if (!process.env.ZPAY_PID || !process.env.ZPAY_KEY) {
      console.error('❌ ZPay 环境变量未设置！');
      return NextResponse.json(
        {
          error: "支付配置错误：请检查 ZPAY_PID 和 ZPAY_KEY 环境变量",
          details: {
            zpay_pid_set: !!process.env.ZPAY_PID,
            zpay_key_set: !!process.env.ZPAY_KEY,
          }
        },
        { status: 500 }
      );
    }
    // === 调试信息结束 ===

    // 获取当前用户
    const supabase = createServerSupabaseClient();
    // ... 其余代码
```

---

## 💡 常见问题

### Q1: 我已经设置了环境变量，为什么还是报错？

**A**: 修改 `.env.local` 后必须重启开发服务器。Next.js 只在启动时读取环境变量。

### Q2: 如何确认环境变量已经生效？

**A**: 在 API 中添加 `console.log(process.env.ZPAY_PID)`，查看终端输出。

### Q3: 我没有 ZPay 账号怎么办？

**A**:

1. 访问 https://zpayz.cn 注册账号
2. 或使用上面提到的模拟模式进行开发
3. 或使用其他支付平台（需要修改代码）

### Q4: PID 和 KEY 从哪里获取？

**A**: 登录 ZPay 商户后台，在"商户信息"或"API 配置"页面可以找到。

---

## 🚀 快速修复步骤

1. **停止开发服务器**（Ctrl+C）

2. **编辑 `.env.local`**：

   ```env
   ZPAY_PID=your_real_pid_here
   ZPAY_KEY=your_real_key_here
   ```

3. **重启开发服务器**：

   ```bash
   npm run dev
   ```

4. **测试支付**：
   - 登录系统
   - 点击购买按钮
   - 查看是否还有错误

---

## 📞 需要帮助？

如果问题仍然存在：

1. 检查 ZPay 商户后台，确认 PID 和 KEY 正确
2. 查看终端日志，确认环境变量已加载
3. 尝试使用模拟模式进行开发测试

**重要提示**：不要在代码中硬编码 PID 和 KEY，始终使用环境变量！
