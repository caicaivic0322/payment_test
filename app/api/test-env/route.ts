import { NextResponse } from "next/server";

export async function GET() {
  const envStatus = {
    supabase: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    app: {
      baseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      baseUrlValue: process.env.NEXT_PUBLIC_BASE_URL,
    },
    zpay: {
      pid: !!process.env.ZPAY_PID,
      key: !!process.env.ZPAY_KEY,
      pidPreview: process.env.ZPAY_PID 
        ? `${process.env.ZPAY_PID.substring(0, 10)}...` 
        : 'Not set',
      pidLength: process.env.ZPAY_PID?.length || 0,
      keyLength: process.env.ZPAY_KEY?.length || 0,
    },
    allConfigured: false,
  };

  // 检查所有必需的环境变量是否都已配置
  envStatus.allConfigured = 
    envStatus.supabase.url &&
    envStatus.supabase.anonKey &&
    envStatus.supabase.serviceRoleKey &&
    envStatus.app.baseUrl &&
    envStatus.zpay.pid &&
    envStatus.zpay.key;

  return NextResponse.json(envStatus);
}
