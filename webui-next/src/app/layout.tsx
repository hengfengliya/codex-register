import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Register - OpenAI 注册系统",
  description: "OpenAI / Codex CLI 自动注册系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="dark min-h-screen">{children}</body>
    </html>
  );
}
