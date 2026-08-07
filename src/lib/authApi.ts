/**
 * Client for the patmimo-utilities auth + admin backend.
 * The frontend never talks to Supabase directly.
 *
 * Token storage (XSS hardening):
 *   - access token  -> in-memory only (never written to web storage). Short-lived
 *     and re-derived from the refresh token on page load, so it survives reloads
 *     without ever being readable via localStorage/sessionStorage.
 *   - refresh token -> sessionStorage (cleared on tab close, not shared across
 *     tabs, not persisted across browser restarts) instead of localStorage.
 * The complete fix is an httpOnly refresh cookie; that requires pinning the
 * backend CORS origin (currently wildcard) so it is intentionally not done here.
 */

const BASE_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const REFRESH_KEY = 'pm_refresh_token';

// Access token kept only in module memory — deliberately never persisted.
let accessToken: string | null = null;

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
  return accessToken;
}

function setTokens(access: string, refresh: string) {
  accessToken = access;
  sessionStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
}

/** Extract a human message from a response body, if one is present. */
async function bodyMessage(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    return body.message || body.detail || body.error || null;
  } catch {
    return null;
  }
}

async function parseError(res: Response): Promise<string> {
  return (await bodyMessage(res)) ?? `Request failed (${res.status})`;
}

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';
export const NO_PERMISSION_MESSAGE = "You don't have permission to do that.";

/**
 * Friendly message for a failed authenticated request. Prefers a message from
 * the response body (message/detail/error); otherwise falls back to plain
 * language for auth failures instead of a raw "401"/"403". A 401 also clears
 * the dead session so the next navigation sends the user to sign in.
 */
export async function authErrorMessage(res: Response, fallback?: string): Promise<string> {
  const message = await bodyMessage(res);
  if (res.status === 401) clearTokens();
  if (message) return message;
  if (res.status === 401) return SESSION_EXPIRED_MESSAGE;
  if (res.status === 403) return NO_PERMISSION_MESSAGE;
  return fallback ?? `Request failed (${res.status})`;
}

async function tryRefresh(): Promise<boolean> {
  const refresh_token = sessionStorage.getItem(REFRESH_KEY);
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
  // After a reload the in-memory access token is gone; re-derive it from the
  // refresh token (sessionStorage) before giving up on the session.
  if (!getAccessToken() && !(await tryRefresh())) return null;
  const res = await authFetch('/api/auth/me');
  if (!res.ok) {
    clearTokens();
    return null;
  }
  return (await res.json()) as AuthUser;
}

// ---- Password flows ----

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const res = await authFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function resetPassword(token_hash: string, new_password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_hash, new_password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
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
