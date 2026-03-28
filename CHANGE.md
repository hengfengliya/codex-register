# 2026-03-28

## ✨ feat: 新增 Next.js Web UI（Vercel 部署版）
> 16:00 | 为项目创建独立的 Next.js 前端，支持通过 GitHub 关联 Vercel 一键部署

- **变更文件**:
  - `A` webui-next/package.json
  - `A` webui-next/next.config.mjs
  - `A` webui-next/tsconfig.json
  - `A` webui-next/tailwind.config.ts
  - `A` webui-next/postcss.config.mjs
  - `A` webui-next/vercel.json
  - `A` webui-next/.env.example
  - `A` webui-next/.gitignore
  - `A` webui-next/src/app/globals.css
  - `A` webui-next/src/app/layout.tsx
  - `A` webui-next/src/app/page.tsx
  - `A` webui-next/src/app/accounts/page.tsx
  - `A` webui-next/src/app/email-services/page.tsx
  - `A` webui-next/src/app/settings/page.tsx
  - `A` webui-next/src/app/login/page.tsx
  - `A` webui-next/src/components/Navbar.tsx
  - `A` webui-next/src/lib/api.ts
- **细节**:
  - 技术栈：Next.js 14 + TypeScript + Tailwind CSS
  - 5 个页面：注册控制台、账号管理、邮箱服务、设置、登录
  - 通过 `NEXT_PUBLIC_API_BASE_URL` 环境变量连接 Python 后端
  - WebSocket 实时日志直连后端（浏览器 → 后端）
  - 构建验证通过，所有路由静态预渲染
