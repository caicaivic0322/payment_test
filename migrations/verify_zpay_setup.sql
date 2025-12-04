-- ZPay 系统验证 SQL 脚本
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本

-- ============================================
-- 1. 检查 zpay_transactions 表是否存在
-- ============================================
SELECT 
  'zpay_transactions 表' as 检查项,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'zpay_transactions'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在 - 请运行迁移脚本'
  END as 状态;

-- ============================================
-- 2. 检查表结构
-- ============================================
SELECT 
  '表结构检查' as 检查项,
  column_name as 字段名,
  data_type as 数据类型,
  is_nullable as 可为空
FROM information_schema.columns 
WHERE table_name = 'zpay_transactions'
ORDER BY ordinal_position;

-- ============================================
-- 3. 检查索引
-- ============================================
SELECT 
  '索引检查' as 检查项,
  indexname as 索引名,
  indexdef as 索引定义
FROM pg_indexes 
WHERE tablename = 'zpay_transactions';

-- ============================================
-- 4. 检查 RLS 策略
-- ============================================
SELECT 
  'RLS 策略检查' as 检查项,
  policyname as 策略名,
  cmd as 命令类型,
  qual as 条件
FROM pg_policies 
WHERE tablename = 'zpay_transactions';

-- ============================================
-- 5. 查看所有注册用户
-- ============================================
SELECT 
  '注册用户列表' as 检查项,
  id as 用户ID,
  email as 邮箱,
  created_at as 注册时间,
  email_confirmed_at as 邮箱确认时间
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- 6. 查看所有交易记录（应该为空，直到用户点击购买）
-- ============================================
SELECT 
  '交易记录' as 检查项,
  COUNT(*) as 记录数
FROM zpay_transactions;

-- 如果有记录，显示详情
SELECT 
  '交易详情' as 类型,
  out_trade_no as 订单号,
  product_id as 产品ID,
  money as 金额,
  payment_status as 支付状态,
  created_at as 创建时间
FROM zpay_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- 7. 检查触发器
-- ============================================
SELECT 
  '触发器检查' as 检查项,
  trigger_name as 触发器名,
  event_manipulation as 事件类型,
  action_statement as 动作
FROM information_schema.triggers 
WHERE event_object_table = 'zpay_transactions';

-- ============================================
-- 8. 系统就绪状态总结
-- ============================================
SELECT 
  '系统就绪状态' as 检查项,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zpay_transactions')
    THEN '✅ 数据库已就绪，可以开始测试支付流程'
    ELSE '❌ 请先运行迁移脚本创建表'
  END as 状态;

-- ============================================
-- 提示信息
-- ============================================
SELECT 
  '💡 重要提示' as 信息,
  'zpay_transactions 表只在用户点击购买按钮时才会创建记录，而不是在注册时。如果表为空，这是正常的！' as 说明;
