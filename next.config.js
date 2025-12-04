/** @type {import('next').NextConfig} */
const nextConfig = {
  // 设置输出目录为build，适配Render部署要求
  distDir: 'build',
  
  // 启用图片优化，现在已安装sharp包
  images: {
    unoptimized: false,
    domains: ['your-app-name.onrender.com'], // 替换为您的实际域名
  },
  
  // 确保基础路径正确
  basePath: '',
  assetPrefix: '',
  
  // 配置webpack以解决文件复制问题
  webpack: (config, { isServer }) => {
    // 解决文件复制问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  
  // 配置实验性功能
  experimental: {
    // 启用服务器组件外部包
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // 优化构建配置
  swcMinify: true,
  poweredByHeader: false,
  
  // 配置压缩
  compress: true,
  
  // 配置静态文件缓存
  generateEtags: true,
}

module.exports = nextConfig