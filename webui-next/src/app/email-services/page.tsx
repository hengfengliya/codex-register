"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { emailServices, type EmailService } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  tempmail: "Tempmail.lol",
  outlook: "Outlook",
  moe_mail: "MoeMail",
  temp_mail: "Temp-Mail",
  duck_mail: "DuckMail",
  cloud_mail: "Cloud Mail",
  imap_mail: "IMAP",
  cpa: "CPA",
  sub2api: "Sub2API",
  tm: "Team Manager",
  newapi: "NewAPI",
};

export default function EmailServicesPage() {
  const [items, setItems] = useState<EmailService[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<EmailService> | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [formData, setFormData] = useState({
    name: "",
    service_type: "tempmail",
    config: "{}",
    is_enabled: true,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emailServices.list();
      setItems(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setFormData({ name: "", service_type: "tempmail", config: "{}", is_enabled: true });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item: EmailService) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      service_type: item.service_type,
      config: JSON.stringify(item.config || {}, null, 2),
      is_enabled: item.is_enabled,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      let configObj: Record<string, unknown> = {};
      try { configObj = JSON.parse(formData.config); } catch { setFormError("Config JSON 格式错误"); setSaving(false); return; }
      const payload = { ...formData, config: configObj };
      if (editItem?.id) {
        await emailServices.update(editItem.id, payload);
      } else {
        await emailServices.create(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此服务？")) return;
    await emailServices.delete(id);
    load();
  };

  const handleTest = async (id: number) => {
    setTestResults((prev) => ({ ...prev, [id]: { ok: false, msg: "测试中..." } }));
    try {
      const result = await emailServices.test(id);
      setTestResults((prev) => ({ ...prev, [id]: { ok: result.success, msg: result.message } }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, msg: e instanceof Error ? e.message : "测试失败" } }));
    }
  };

  const handleToggle = async (item: EmailService) => {
    if (item.is_enabled) {
      await emailServices.disable(item.id);
    } else {
      await emailServices.enable(item.id);
    }
    load();
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>邮箱服务管理</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              配置注册所使用的邮箱服务，支持多种服务类型
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + 添加服务
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><p>加载中...</p></div>
        ) : items.length === 0 ? (
          <div className="empty-state card py-10">
            <div className="empty-state-icon">📭</div>
            <p>暂未配置邮箱服务</p>
            <button className="btn btn-primary mt-3" onClick={openCreate}>添加第一个服务</button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 状态指示点 */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: item.is_enabled ? "var(--success)" : "var(--text-muted)" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                          {item.name}
                        </span>
                        <span className="badge badge-info text-xs">
                          {TYPE_LABELS[item.service_type] ?? item.service_type}
                        </span>
                        {!item.is_enabled && (
                          <span className="badge badge-gray text-xs">已禁用</span>
                        )}
                      </div>
                      <div className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                        ID: {item.id} · 创建于 {new Date(item.created_at).toLocaleDateString("zh-CN")}
                      </div>
                      {testResults[item.id] && (
                        <div
                          className="text-xs mt-1"
                          style={{ color: testResults[item.id].ok ? "var(--success)" : "var(--danger)" }}
                        >
                          {testResults[item.id].ok ? "✅" : "❌"} {testResults[item.id].msg}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="btn btn-ghost text-xs" onClick={() => handleTest(item.id)}>
                      测试
                    </button>
                    <button className="btn btn-ghost text-xs" onClick={() => handleToggle(item)}>
                      {item.is_enabled ? "禁用" : "启用"}
                    </button>
                    <button className="btn btn-ghost text-xs" onClick={() => openEdit(item)}>
                      编辑
                    </button>
                    <button
                      className="btn btn-ghost text-xs"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleDelete(item.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="card w-full max-w-md p-6">
            <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-primary)" }}>
              {editItem ? "编辑服务" : "添加邮箱服务"}
            </h3>

            {formError && (
              <div className="text-sm rounded px-3 py-2 mb-3" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>服务名称</label>
                <input className="form-input" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="例：我的 Outlook 服务" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>服务类型</label>
                <select className="form-select" value={formData.service_type} onChange={(e) => setFormData((p) => ({ ...p, service_type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>配置 (JSON)</label>
                <textarea
                  className="form-input font-mono text-xs"
                  rows={5}
                  value={formData.config}
                  onChange={(e) => setFormData((p) => ({ ...p, config: e.target.value }))}
                  placeholder='{"key": "value"}'
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_enabled} onChange={(e) => setFormData((p) => ({ ...p, is_enabled: e.target.checked }))} style={{ accentColor: "var(--primary)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>启用此服务</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
