-- Create zpay_transactions table
CREATE TABLE IF NOT EXISTS zpay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 订单信息
  out_trade_no VARCHAR(255) UNIQUE NOT NULL, -- 商户订单号
  trade_no VARCHAR(255), -- ZPay订单号
  
  -- 产品信息
  product_id VARCHAR(100) NOT NULL, -- 产品ID (basic-onetime, pro-monthly, pro-yearly)
  product_name VARCHAR(255) NOT NULL, -- 商品名称
  money DECIMAL(10, 2) NOT NULL, -- 订单金额
  
  -- 支付信息
  payment_type VARCHAR(20) NOT NULL, -- 支付方式 (alipay, wxpay)
  payment_status VARCHAR(50) DEFAULT 'pending', -- 支付状态 (pending, success, failed)
  
  -- 订阅信息 (仅用于订阅产品)
  is_subscription BOOLEAN DEFAULT false,
  subscription_period VARCHAR(20), -- monthly, yearly
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  
  -- 附加信息
  param TEXT, -- 附加内容
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE -- 支付完成时间
);

-- 创建索引以提高查询性能
CREATE INDEX idx_zpay_transactions_user_id ON zpay_transactions(user_id);
CREATE INDEX idx_zpay_transactions_out_trade_no ON zpay_transactions(out_trade_no);
CREATE INDEX idx_zpay_transactions_trade_no ON zpay_transactions(trade_no);
CREATE INDEX idx_zpay_transactions_payment_status ON zpay_transactions(payment_status);
CREATE INDEX idx_zpay_transactions_created_at ON zpay_transactions(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zpay_transactions_updated_at 
  BEFORE UPDATE ON zpay_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 添加RLS策略
ALTER TABLE zpay_transactions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的交易记录
CREATE POLICY "Users can view their own transactions" 
  ON zpay_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 用户可以创建自己的交易记录
CREATE POLICY "Users can create their own transactions" 
  ON zpay_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 注释
COMMENT ON TABLE zpay_transactions IS 'ZPay支付交易记录表';
COMMENT ON COLUMN zpay_transactions.out_trade_no IS '商户订单号，唯一标识';
COMMENT ON COLUMN zpay_transactions.trade_no IS 'ZPay平台订单号';
COMMENT ON COLUMN zpay_transactions.product_id IS '产品ID';
COMMENT ON COLUMN zpay_transactions.money IS '订单金额';
COMMENT ON COLUMN zpay_transactions.payment_status IS '支付状态: pending-待支付, success-成功, failed-失败';
COMMENT ON COLUMN zpay_transactions.is_subscription IS '是否为订阅产品';
COMMENT ON COLUMN zpay_transactions.subscription_period IS '订阅周期: monthly-月付, yearly-年付';
