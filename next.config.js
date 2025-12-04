/** @type {import('next').NextConfig} */
const nextConfig = {
  // 设置输出目录为build，适配Render部署要求
  distDir: 'build',
  
  // 启用独立输出模式，减少依赖
  output: 'standalone',
  
  // 禁用图片优化，避免sharp包依赖问题
  images: {
    unoptimized: true
  },
  
  // 确保基础路径正确
  basePath: '',
  assetPrefix: '',
}

module.exports = nextConfig