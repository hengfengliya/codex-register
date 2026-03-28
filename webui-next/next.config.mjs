/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许在 Vercel 上通过环境变量配置后端 API 地址
  async rewrites() {
    const apiBase = process.env.API_BASE_URL;
    if (!apiBase) return [];
    return [
      {
        source: "/proxy/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
