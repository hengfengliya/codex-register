"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { registration, getWsBase, getApiBase } from "@/lib/api";

interface LogLine {
  id: number;
  text: string;
  type: "info" | "success" | "error" | "warning";
}

interface BatchProgress {
  total: number;
  success: number;
  failed: number;
  remaining: number;
  percent: number;
}

let logCounter = 0;

export default function RegisterPage() {
  // ── 表单状态 ────────────────────────────────────────────────────────
  const [emailServiceType, setEmailServiceType] = useState("tempmail");
  const [regMode, setRegMode] = useState("single");
  const [batchCount, setBatchCount] = useState(5);
  const [concurrencyMode, setConcurrencyMode] = useState("pipeline");
  const [concurrencyCount, setConcurrencyCount] = useState(3);
  const [intervalMin, setIntervalMin] = useState(5);
  const [intervalMax, setIntervalMax] = useState(30);
  const [autoUploadCpa, setAutoUploadCpa] = useState(false);
  const [autoUploadSub2api, setAutoUploadSub2api] = useState(false);

  // ── 任务状态 ────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [taskUuid, setTaskUuid] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState("-");
  const [logs, setLogs] = useState<LogLine[]>([
    { id: 0, text: "[系统] 准备就绪，等待开始注册...", type: "info" },
  ]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [recentAccounts, setRecentAccounts] = useState<
    { id: number; email: string; password?: string; status: string }[]
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((text: string, type: LogLine["type"] = "info") => {
    setLogs((prev) => [...prev.slice(-200), { id: ++logCounter, text, type }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 加载最近账号
  const loadRecentAccounts = useCallback(async () => {
    try {
      const res = await fetch(
        `${getApiBase()}/api/accounts?page=1&page_size=10`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        // 后端返回 { total, accounts }
        setRecentAccounts(data.accounts || []);
      }
    } catch {/* ignore */}
  }, []);

  useEffect(() => { loadRecentAccounts(); }, [loadRecentAccounts]);

  // ── WebSocket 连接 ───────────────────────────────────────────────────
  const connectWs = useCallback(
    (id: string, type: "task" | "batch") => {
      if (wsRef.current) wsRef.current.close();
      const wsBase = getWsBase();
      const url =
        type === "task"
          ? `${wsBase}/api/ws/task/${id}`
          : `${wsBase}/api/ws/batch/${id}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => addLog("[WS] 已连接实时日志", "info");
      ws.onclose = () => {
        addLog("[WS] 连接关闭", "info");
        setRunning(false);
        loadRecentAccounts();
      };
      ws.onerror = () => addLog("[WS] WebSocket 错误，请检查后端地址", "error");

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const msgType = (msg.type as string) || "";
          const logType: LogLine["type"] =
            msgType === "success" ? "success"
            : msgType === "error" ? "error"
            : msgType === "warning" ? "warning"
            : "info";

          if (msg.message) addLog(msg.message, logType);
          if (msg.status) setTaskStatus(msg.status);

          // 批量进度字段
          if (msg.total !== undefined) {
            const done = (msg.success ?? 0) + (msg.failed ?? 0);
            setProgress({
              total: msg.total,
              success: msg.success ?? 0,
              failed: msg.failed ?? 0,
              remaining: msg.remaining ?? (msg.total - done),
              percent: msg.total > 0 ? Math.round((done / msg.total) * 100) : 0,
            });
          }

          if (["complete", "error", "cancelled", "failed"].includes(msgType)) {
            setRunning(false);
            ws.close();
            loadRecentAccounts();
          }
        } catch {
          // 非 JSON 消息直接显示
          addLog(e.data, "info");
        }
      };
    },
    [addLog, loadRecentAccounts]
  );

  // ── 开始注册 ─────────────────────────────────────────────────────────
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (running) return;

    setRunning(true);
    setProgress(null);
    setTaskStatus("运行中");
    setLogs([{ id: ++logCounter, text: "[系统] 正在启动注册任务...", type: "info" }]);

    try {
      if (regMode === "single") {
        // 单次注册 → POST /api/registration/start
        const result = await registration.start({
          email_service_type: emailServiceType,
          auto_upload_cpa: autoUploadCpa,
          auto_upload_sub2api: autoUploadSub2api,
        });
        // 后端返回 task_uuid，用于 WebSocket
        setTaskUuid(result.task_uuid);
        setBatchId(null);
        addLog(`[系统] 任务已创建：${result.task_uuid}`, "info");
        connectWs(result.task_uuid, "task");
      } else {
        // 批量注册 → POST /api/registration/batch
        const result = await registration.batch({
          email_service_type: emailServiceType,
          count: batchCount,
          mode: concurrencyMode,
          concurrency: concurrencyCount,
          interval_min: intervalMin,
          interval_max: intervalMax,
          auto_upload_cpa: autoUploadCpa,
          auto_upload_sub2api: autoUploadSub2api,
        });
        setBatchId(result.batch_id);
        setTaskUuid(null);
        addLog(`[系统] 批量任务已创建：${result.batch_id}，共 ${result.count} 个`, "info");
        connectWs(result.batch_id, "batch");
      }
    } catch (err) {
      addLog(`[错误] ${err instanceof Error ? err.message : "启动失败"}`, "error");
      setRunning(false);
      setTaskStatus("失败");
    }
  };

  // ── 取消任务 ─────────────────────────────────────────────────────────
  const handleCancel = async () => {
    try {
      if (batchId) await registration.cancelBatch(batchId);
      else if (taskUuid) await registration.cancel(taskUuid);
    } catch {/* ignore */}
    wsRef.current?.close();
    setRunning(false);
    setTaskStatus("已取消");
    addLog("[系统] 已发送取消请求", "warning");
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

          {/* ── 左侧：注册设置 ── */}
          <div className="card p-5 lg:sticky lg:top-[73px]">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              📝 注册设置
            </h3>
            <form onSubmit={handleStart} className="space-y-4">

              {/* 邮箱服务 */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  邮箱服务
                </label>
                <select
                  className="form-select"
                  value={emailServiceType}
                  onChange={(e) => setEmailServiceType(e.target.value)}
                >
                  <option value="tempmail">Tempmail.lol (临时邮箱)</option>
                  <option value="outlook">Outlook</option>
                  <option value="moe_mail">MoeMail</option>
                  <option value="temp_mail">Temp-Mail 自部署</option>
                  <option value="duck_mail">DuckMail</option>
                  <option value="cloud_mail">Cloud Mail</option>
                  <option value="imap_mail">IMAP 邮箱</option>
                  <option value="freemail">FreeMail</option>
                </select>
              </div>

              {/* 注册模式 */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  注册模式
                </label>
                <select
                  className="form-select"
                  value={regMode}
                  onChange={(e) => setRegMode(e.target.value)}
                >
                  <option value="single">单次注册</option>
                  <option value="batch">批量注册</option>
                </select>
              </div>

              {/* 批量选项 */}
              {regMode === "batch" && (
                <div className="space-y-3 pl-3 border-l-2" style={{ borderColor: "var(--primary)" }}>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                      注册数量
                    </label>
                    <input type="number" className="form-input" min={1}
                      value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                      并发模式
                    </label>
                    <select className="form-select" value={concurrencyMode}
                      onChange={(e) => setConcurrencyMode(e.target.value)}>
                      <option value="pipeline">流水线（Pipeline）</option>
                      <option value="parallel">并行（Parallel）</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                      并发数 (1-50)
                    </label>
                    <input type="number" className="form-input" min={1} max={50}
                      value={concurrencyCount} onChange={(e) => setConcurrencyCount(Number(e.target.value))} />
                  </div>
                  {concurrencyMode === "pipeline" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                          最小间隔(秒)
                        </label>
                        <input type="number" className="form-input" min={0} max={300}
                          value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                          最大间隔(秒)
                        </label>
                        <input type="number" className="form-input" min={1} max={600}
                          value={intervalMax} onChange={(e) => setIntervalMax(Number(e.target.value))} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 自动上传 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  注册后自动操作
                </label>
                <div className="space-y-2">
                  {[
                    { label: "上传到 CPA", state: autoUploadCpa, set: setAutoUploadCpa },
                    { label: "上传到 Sub2API", state: autoUploadSub2api, set: setAutoUploadSub2api },
                  ].map(({ label, state, set }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={state}
                        onChange={(e) => set(e.target.checked)}
                        style={{ accentColor: "var(--primary)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2 pt-2">
                <button type="submit" className="btn btn-primary w-full" disabled={running}>
                  {running ? "⏳ 注册中..." : "🚀 开始注册"}
                </button>
                <button type="button" className="btn btn-secondary w-full"
                  disabled={!running} onClick={handleCancel}>
                  取消任务
                </button>
              </div>
            </form>
          </div>

          {/* ── 右侧 ── */}
          <div className="space-y-5">
            {/* 监控台 */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  💻 监控台
                  {running && <span className="badge badge-info text-xs">运行中</span>}
                </h3>
                <div className="flex items-center gap-2">
                  {taskStatus !== "-" && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      状态: {taskStatus}
                    </span>
                  )}
                  <button className="btn btn-ghost text-xs" onClick={() => setLogs([])}>清空</button>
                </div>
              </div>

              {/* 批量进度 */}
              {progress && (
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {progress.success + progress.failed}/{progress.total}
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{progress.percent}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span style={{ color: "var(--success)" }}>✅ 成功 {progress.success}</span>
                    <span style={{ color: "var(--danger)" }}>❌ 失败 {progress.failed}</span>
                    <span style={{ color: "var(--text-muted)" }}>⏳ 剩余 {progress.remaining}</span>
                  </div>
                </div>
              )}

              <div className="console-log">
                {logs.map((l) => (
                  <div key={l.id} className={`log-${l.type}`}>{l.text}</div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* 已注册账号 */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  📋 已注册账号
                </h3>
                <div className="flex gap-2">
                  <button className="btn btn-ghost text-xs" onClick={loadRecentAccounts}>🔄 刷新</button>
                  <a href="/accounts" className="btn btn-secondary text-xs">查看全部</a>
                </div>
              </div>
              {recentAccounts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p>暂无已注册账号</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>ID</th>
                        <th>邮箱</th>
                        <th style={{ width: 150 }}>密码</th>
                        <th style={{ width: 80 }}>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAccounts.map((acc) => (
                        <tr key={acc.id}>
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
                            <span className={`badge ${acc.status === "active" ? "badge-success" : acc.status === "failed" ? "badge-danger" : "badge-gray"}`}>
                              {acc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
