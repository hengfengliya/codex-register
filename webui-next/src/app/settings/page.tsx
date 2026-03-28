"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { settings } from "@/lib/api";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "password" | "textarea";
  hint?: string;
  group: string;
}

const FIELDS: SettingField[] = [
  { key: "app_name", label: "应用名称", type: "text", group: "基本设置" },
  { key: "webui_host", label: "监听主机", type: "text", hint: "默认 0.0.0.0", group: "基本设置" },
  { key: "webui_port", label: "监听端口", type: "number", hint: "默认 15555", group: "基本设置" },
  { key: "webui_access_password", label: "访问密码", type: "password", group: "基本设置" },
  { key: "debug", label: "调试模式", type: "boolean", group: "基本设置" },
  { key: "log_level", label: "日志级别", type: "text", hint: "DEBUG / INFO / WARNING / ERROR", group: "基本设置" },
  { key: "proxy_url", label: "代理地址", type: "text", hint: "http://user:pass@host:port", group: "代理设置" },
  { key: "proxy_pool_url", label: "代理池 URL", type: "text", group: "代理设置" },
  { key: "registration_timeout", label: "注册超时 (秒)", type: "number", group: "注册设置" },
  { key: "email_poll_interval", label: "邮件轮询间隔 (秒)", type: "number", group: "注册设置" },
  { key: "email_poll_max_retries", label: "邮件轮询最大次数", type: "number", group: "注册设置" },
  { key: "cpa_url", label: "CPA 地址", type: "text", group: "上传设置" },
  { key: "cpa_key", label: "CPA Key", type: "password", group: "上传设置" },
  { key: "sub2api_url", label: "Sub2API 地址", type: "text", group: "上传设置" },
  { key: "sub2api_key", label: "Sub2API Key", type: "password", group: "上传设置" },
];

export default function SettingsPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    settings.get().then(setData).catch(() => setError("加载设置失败")).finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await settings.update(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>系统设置</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>配置系统运行参数</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "保存中..." : saved ? "✅ 已保存" : "保存设置"}
          </button>
        </div>

        {error && (
          <div className="rounded px-4 py-3 mb-4 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><p>加载中...</p></div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group} className="card p-5">
                <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--primary)" }}>
                  {group}
                </h3>
                <div className="space-y-4">
                  {FIELDS.filter((f) => f.group === group).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        {field.label}
                      </label>
                      {field.type === "boolean" ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!data[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.checked)}
                            style={{ accentColor: "var(--primary)" }}
                          />
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>启用</span>
                        </label>
                      ) : field.type === "textarea" ? (
                        <textarea
                          className="form-input font-mono text-xs"
                          rows={4}
                          value={String(data[field.key] ?? "")}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                      ) : (
                        <input
                          className="form-input"
                          type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                          value={String(data[field.key] ?? "")}
                          onChange={(e) =>
                            handleChange(
                              field.key,
                              field.type === "number" ? Number(e.target.value) : e.target.value
                            )
                          }
                          placeholder={field.hint}
                        />
                      )}
                      {field.hint && field.type !== "boolean" && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{field.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 高级：原始 JSON 查看 */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--primary)" }}>原始配置 (只读)</h3>
              <pre className="text-xs overflow-auto rounded p-3" style={{ background: "#0a0f1a", color: "#94a3b8", maxHeight: 200 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
