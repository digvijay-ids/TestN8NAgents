/**
 * Client for the patmimo-utilities auth + admin backend.
 * Replaces direct supabase-js usage. Tokens live in localStorage; the frontend
 * never talks to Supabase directly.
 */

const BASE_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const ACCESS_KEY = 'pm_access_token';
const REFRESH_KEY = 'pm_refresh_token';

export interface AuthUser {
  user_id: string;
  email: string | null;
  full_name?: string | null;
  is_super_admin: boolean;
  accessible_paths: string[];
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string | null;
  is_super_admin: boolean;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail || body.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  if (!refresh_token) return false;
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as LoginResponse;
  setTokens(data.access_token, data.refresh_token);
  return true;
}

/**
 * Authenticated fetch against the backend. Attaches the bearer token and, on a
 * 401, transparently refreshes once and retries. Shared by adminApi.
 */
export async function authFetch(path: string, options: RequestInit = {}, _retry = true): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401 && _retry && (await tryRefresh())) {
    return authFetch(path, options, false);
  }
  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, options);
  if (!res.ok) throw new Error(await parseError(res));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// ---- Auth flows ----

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as LoginResponse;
  setTokens(data.access_token, data.refresh_token);
}

export async function logout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getAccessToken()) return null;
  const res = await authFetch('/api/auth/me');
  if (!res.ok) {
    clearTokens();
    return null;
  }
  return (await res.json()) as AuthUser;
}

export async function fetchPublicPaths(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/pages/public`);
    if (!res.ok) return [];
    const data = (await res.json()) as { paths: string[] };
    return data.paths ?? [];
  } catch {
    return [];
  }
}
