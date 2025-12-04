import { createClient } from "@/utils/supabase/client";

// 获取用户订阅信息
export async function getUserSubscription(userId: string) {
  const supabase = createClient();
  
  try {
    // 获取用户最新的订阅信息
    const { data, error } = await supabase
      .from('zpay_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_subscription', true)
      .eq('payment_status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 是没有找到记录的错误码
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('获取用户订阅信息失败:', error);
    return null;
  }
}

// 获取用户所有交易记录
export async function getUserTransactions(userId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('zpay_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('获取用户交易记录失败:', error);
    return [];
  }
}

// 获取用户交易记录详情
export async function getTransactionDetails(transactionId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('zpay_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('获取交易详情失败:', error);
    return null;
  }
}