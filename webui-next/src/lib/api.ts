/**
 * API 客户端工具
 * 所有请求统一通过此文件发送到 Python FastAPI 后端
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://backend-production-e1ed7.up.railway.app";

export function getApiBase() {
  return API_BASE;
}

export function getWsBase() {
  return API_BASE.replace(/^https/, "wss").replace(/^http/, "ws");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {/* ignore */}
    throw new Error(detail || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  login: (password: string, next = "/") =>
    request<void>("/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password, next }),
    }),
  logout: () => request<void>("/logout"),
};

// ─── Registration ──────────────────────────────────────────────────────────

/** 单次注册请求（POST /api/registration/start） */
export interface RegistrationStartPayload {
  email_service_type: string;        // 例 "tempmail", "outlook", "moe_mail"
  email_service_id?: number;         // 使用数据库中已配置的邮箱服务 ID
  proxy?: string;
  auto_upload_cpa?: boolean;
  cpa_service_ids?: number[];
  auto_upload_sub2api?: boolean;
  sub2api_service_ids?: number[];
  auto_upload_tm?: boolean;
  tm_service_ids?: number[];
  auto_upload_newapi?: boolean;
  newapi_service_ids?: number[];
}

/** 批量注册请求（POST /api/registration/batch） */
export interface BatchRegistrationPayload {
  count: number;                     // 注册数量 1-100
  email_service_type: string;
  email_service_id?: number;
  proxy?: string;
  interval_min?: number;             // 最小间隔秒数
  interval_max?: number;             // 最大间隔秒数
  concurrency?: number;              // 并发数
  mode?: string;                     // "pipeline" | "parallel"
  auto_upload_cpa?: boolean;
  cpa_service_ids?: number[];
  auto_upload_sub2api?: boolean;
  sub2api_service_ids?: number[];
  auto_upload_tm?: boolean;
  tm_service_ids?: number[];
  auto_upload_newapi?: boolean;
  newapi_service_ids?: number[];
}

export interface RegistrationTaskResponse {
  id: number;
  task_uuid: string;                 // WS 连接用此字段
  status: string;
  email_service_id?: number;
  proxy?: string;
  error_message?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface BatchRegistrationResponse {
  batch_id: string;                  // WS 连接用此字段
  count: number;
  tasks: RegistrationTaskResponse[];
}

export const registration = {
  /** 单次注册 */
  start: (payload: RegistrationStartPayload) =>
    request<RegistrationTaskResponse>("/api/registration/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** 批量注册 */
  batch: (payload: BatchRegistrationPayload) =>
    request<BatchRegistrationResponse>("/api/registration/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** 取消单个任务 */
  cancel: (taskUuid: string) =>
    request<void>(`/api/registration/tasks/${taskUuid}/cancel`, { method: "POST" }),

  /** 取消批量任务 */
  cancelBatch: (batchId: string) =>
    request<void>(`/api/registration/batch/${batchId}/cancel`, { method: "POST" }),
};

// ─── Accounts ─────────────────────────────────────────────────────────────

/** 后端 AccountResponse 字段（来自 accounts.py account_to_response） */
export interface Account {
  id: number;
  email: string;
  password?: string;
  client_id?: string;
  email_service: string;
  account_id?: string;
  workspace_id?: string;
  registered_at?: string;
  last_refresh?: string;
  expires_at?: string;
  status: string;
  proxy_used?: string;
  cpa_uploaded: boolean;
  cpa_uploaded_at?: string;
  newapi_uploaded: boolean;
  newapi_uploaded_at?: string;
  cookies?: string;
  created_at?: string;
  updated_at?: string;
  subscription_type?: string;
}

/** 后端 AccountListResponse：{ total, accounts } */
export interface AccountListResponse {
  total: number;
  accounts: Account[];
}

/** 后端 stats/summary 返回：{ total, by_status, by_email_service } */
export interface AccountStats {
  total: number;
  by_status: Record<string, number>;
  by_email_service: Record<string, number>;
}

export const accounts = {
  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    email_service?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.email_service) q.set("email_service", params.email_service);
    return request<AccountListResponse>(`/api/accounts?${q}`);
  },

  get: (id: number) => request<Account>(`/api/accounts/${id}`),

  getTokens: (id: number) =>
    request<{
      id: number; email: string;
      access_token?: string; refresh_token?: string; id_token?: string;
      has_tokens: boolean;
    }>(`/api/accounts/${id}/tokens`),

  delete: (id: number) =>
    request<{ success: boolean }>(`/api/accounts/${id}`, { method: "DELETE" }),

  /** 批量删除：后端字段为 ids，支持 select_all */
  batchDelete: (ids: number[]) =>
    request<{ success: boolean; deleted_count: number }>("/api/accounts/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  refresh: (id: number) =>
    request<void>(`/api/accounts/${id}/refresh`, { method: "POST" }),

  /** 批量刷新：后端字段为 ids */
  batchRefresh: (ids: number[]) =>
    request<void>("/api/accounts/batch-refresh", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  exportJson: (ids?: number[]) =>
    request<object>("/api/accounts/export/json", {
      method: "POST",
      body: JSON.stringify({ ids: ids || [] }),
    }),

  exportCsv: (ids?: number[]) =>
    request<string>("/api/accounts/export/csv", {
      method: "POST",
      body: JSON.stringify({ ids: ids || [] }),
    }),

  /** 统计：返回 { total, by_status, by_email_service } */
  stats: () => request<AccountStats>("/api/accounts/stats/summary"),
};

// ─── Email Services ────────────────────────────────────────────────────────
export interface EmailService {
  id: number;
  name: string;
  service_type: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export const emailServices = {
  list: () => request<{ items: EmailService[]; total: number }>("/api/email-services"),
  get: (id: number) => request<EmailService>(`/api/email-services/${id}`),
  create: (data: Partial<EmailService>) =>
    request<EmailService>("/api/email-services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<EmailService>) =>
    request<EmailService>(`/api/email-services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/api/email-services/${id}`, { method: "DELETE" }),
  test: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/email-services/${id}/test`, {
      method: "POST",
    }),
  enable: (id: number) =>
    request<void>(`/api/email-services/${id}/enable`, { method: "POST" }),
  disable: (id: number) =>
    request<void>(`/api/email-services/${id}/disable`, { method: "POST" }),
  types: () => request<string[]>("/api/email-services/types"),
};

// ─── Settings ─────────────────────────────────────────────────────────────
export interface Settings {
  [key: string]: unknown;
}

export const settings = {
  get: () => request<Settings>("/api/settings"),
  update: (data: Partial<Settings>) =>
    request<Settings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
