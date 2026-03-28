"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { accounts, type Account, type AccountStats } from "@/lib/api";

const STATUS_OPTIONS = ["", "active", "expired", "banned", "failed"];
const STATUS_LABEL: Record<string, string> = {
  active: "活跃",
  expired: "已过期",
  banned: "已封禁",
  failed: "失败",
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "active": return "badge-success";
    case "expired": return "badge-warning";
    case "banned":
    case "failed": return "badge-danger";
    default: return "badge-gray";
  }
}

// Token 弹窗组件
function TokenModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const [tokens, setTokens] = useState<{
    access_token?: string; refresh_token?: string; id_token?: string; has_tokens: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accounts.getTokens(account.id)
      .then(setTokens)
      .catch(() => setTokens({ has_tokens: false }))
      .finally(() => setLoading(false));
  }, [account.id]);

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            🔑 Token 详情 — {account.email}
          </h3>
          <button className="btn btn-ghost text-sm" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>加载中...</p>
        ) : !tokens?.has_tokens ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>该账号暂无 Token 数据</p>
        ) : (
          <div className="space-y-3">
            {[
              { label: "Access Token", value: tokens.access_token },
              { label: "Refresh Token", value: tokens.refresh_token },
              { label: "ID Token", value: tokens.id_token },
            ].map(({ label, value }) => value && (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <button className="btn btn-ghost text-xs" onClick={() => copy(value)}>复制</button>
                </div>
                <div className="font-mono text-xs p-2 rounded overflow-auto"
                  style={{ background: "#0a0f1a", color: "#94a3b8", maxHeight: 80, wordBreak: "break-all" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [tokenAccount, setTokenAccount] = useState<Account | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accounts.list({ page, page_size: pageSize, search, status });
      // 后端返回 { total, accounts }
      setItems(data.accounts);
      setTotal(data.total);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    accounts.stats().then(setStats).catch(() => {});
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === items.length && items.length > 0
      ? new Set()
      : new Set(items.map((i) => i.id))
    );
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此账号？")) return;
    await accounts.delete(id);
    load();
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确认删除选中的 ${selected.size} 个账号？`)) return;
    // 后端期望 { ids: number[] }
    await accounts.batchDelete(Array.from(selected));
    setSelected(new Set());
    load();
  };

  const handleExportCsv = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : undefined;
    try {
      const csv = await accounts.exportCsv(ids);
      const blob = new Blob([csv as string], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accounts_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "导出失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // 统计数字：by_status 字段
  const statNums = {
    total: stats?.total ?? 0,
    active: stats?.by_status?.active ?? 0,
    expired: stats?.by_status?.expired ?? 0,
    banned: stats?.by_status?.banned ?? 0,
    failed: stats?.by_status?.failed ?? 0,
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "总计", value: statNums.total, cls: "badge-info" },
            { label: "活跃", value: statNums.active, cls: "badge-success" },
            { label: "过期", value: statNums.expired, cls: "badge-warning" },
            { label: "封禁", value: statNums.banned, cls: "badge-danger" },
            { label: "失败", value: statNums.failed, cls: "badge-danger" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`badge ${cls} mx-auto mb-1`}>{label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 工具栏 */}
        <div className="card mb-4 p-3 flex flex-wrap items-center gap-3">
          <input className="form-input" style={{ maxWidth: 240 }}
            placeholder="搜索邮箱..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select" style={{ maxWidth: 140 }} value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? STATUS_LABEL[s] ?? s : "全部状态"}</option>
            ))}
          </select>
          <div className="flex-1" />
          {selected.size > 0 && (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>已选 {selected.size} 项</span>
          )}
          <button className="btn btn-secondary text-sm" onClick={handleExportCsv}>📥 导出 CSV</button>
          <button className="btn btn-danger text-sm" disabled={selected.size === 0} onClick={handleBatchDelete}>
            🗑 批量删除
          </button>
        </div>

        {/* 表格 */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="empty-state"><div className="empty-state-icon">⏳</div><p>加载中...</p></div>
          ) : items.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📭</div><p>暂无账号数据</p></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox"
                        checked={selected.size === items.length && items.length > 0}
                        onChange={toggleAll}
                        style={{ accentColor: "var(--primary)" }} />
                    </th>
                    <th style={{ width: 50 }}>ID</th>
                    <th>邮箱</th>
                    <th style={{ width: 150 }}>密码</th>
                    <th style={{ width: 80 }}>状态</th>
                    <th style={{ width: 100 }}>订阅</th>
                    <th style={{ width: 140 }}>注册时间</th>
                    <th style={{ width: 120 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((acc) => (
                    <tr key={acc.id}>
                      <td>
                        <input type="checkbox" checked={selected.has(acc.id)}
                          onChange={() => toggleSelect(acc.id)}
                          style={{ accentColor: "var(--primary)" }} />
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{acc.id}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{acc.email}</td>
                      <td>
                        <span className="font-mono text-xs cursor-pointer"
                          style={{ filter: "blur(4px)", transition: "filter 0.2s", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.filter = "none")}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.filter = "blur(4px)")}>
                          {acc.password || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(acc.status)}`}>
                          {STATUS_LABEL[acc.status] ?? acc.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-gray text-xs">{acc.subscription_type || "free"}</span>
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {acc.registered_at
                          ? new Date(acc.registered_at).toLocaleString("zh-CN")
                          : acc.created_at
                          ? new Date(acc.created_at).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost text-xs" title="查看 Token"
                            onClick={() => setTokenAccount(acc)}>🔑</button>
                          <button className="btn btn-ghost text-xs" title="刷新 Token"
                            onClick={() => accounts.refresh(acc.id).then(load)}>🔄</button>
                          <button className="btn btn-ghost text-xs" title="删除"
                            style={{ color: "var(--danger)" }}
                            onClick={() => handleDelete(acc.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              共 {total} 条，第 {page}/{totalPages} 页
            </p>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                上一页
              </button>
              <button className="btn btn-secondary text-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                下一页
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Token 弹窗 */}
      {tokenAccount && <TokenModal account={tokenAccount} onClose={() => setTokenAccount(null)} />}
    </div>
  );
}
