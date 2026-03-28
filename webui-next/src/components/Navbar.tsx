"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getApiBase } from "@/lib/api";

const navLinks = [
  { href: "/", label: "注册" },
  { href: "/accounts", label: "账号管理" },
  { href: "/email-services", label: "邮箱服务" },
  { href: "/settings", label: "设置" },
];

export default function Navbar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    window.location.href = `${getApiBase()}/logout`;
  };

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
          ⚡ Codex Register
        </span>
      </div>

      {/* Links */}
      <div className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              color:
                pathname === link.href
                  ? "var(--primary)"
                  : "var(--text-secondary)",
              background:
                pathname === link.href
                  ? "rgba(16, 163, 127, 0.1)"
                  : "transparent",
              fontWeight: pathname === link.href ? 600 : 400,
            }}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="btn btn-ghost text-sm ml-2"
          style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}
        >
          退出
        </button>
      </div>
    </nav>
  );
}
