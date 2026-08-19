import { apiJson } from '@/lib/authApi';

/** Audit-log read access (super-admin only; server enforces via RLS). */

export interface AuditRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  summary: string | null;
  method: string;
  path: string;
  status_code: number;
  action: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  duration_ms: number | null;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
}

export interface AuditFilters {
  limit?: number;
  offset?: number;
  actor_id?: string;
  action?: string;
  method?: string;
  status?: number;
  q?: string;
  from?: string;
  to?: string;
}

export async function listAuditLog(filters: AuditFilters = {}): Promise<AuditPage> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return apiJson<AuditPage>(`/api/admin/audit-log${qs ? `?${qs}` : ''}`);
}

export async function listAuditActions(): Promise<string[]> {
  return apiJson<string[]>('/api/admin/audit-log/actions');
}
