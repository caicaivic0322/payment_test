# 支付策略说明

## 当前配置

### 支付模式
- **真实支付**: 已启用 (NEXT_PUBLIC_USE_MOCK_PAYMENT=false)
- **支付网关**: Z-Pay (https://zpayz.cn)

### 环境变量配置
在 `.env.local` 文件中设置以下变量：

```bash
# 支付配置
NEXT_PUBLIC_USE_MOCK_PAYMENT=false

# Z-Pay 支付网关配置
ZPAY_PID=20220726190052
ZPAY_KEY=BeyK9E9O7n1bwdWj0WCzWpwhmZJPjc2u
```

### 产品定价
- **基础版**: 0.1元 (一次性)
- **专业版月付**: 0.1元/月
- **专业版年付**: 1元/年

### 支付流程
1. 用户选择产品并点击购买/订阅
2. 系统调用 `/api/checkout/providers/zpay/url` API
3. 生成订单并记录到数据库
4. 跳转到 Z-Pay 支付页面
5. 用户完成支付
6. Z-Pay 回调通知 `/api/checkout/providers/zpay/webhook`
7. 系统更新订单状态和订阅信息

### 部署注意事项
- 在 Vercel 部署时，需要设置相同的环境变量
- `.env.local` 文件不会被提交到 Git，需要在 Vercel 控制台中手动设置环境变量

### 测试
- 本地测试: 访问 http://localhost:3000 并登录后选择产品购买
- 生产测试: 访问部署后的 URL 并登录后选择产品购买