/**
 * API Configuration — DocProcessing calls are proxied through patmimo-utilities
 * and authenticated with the user's Supabase bearer token (no Basic auth in the
 * browser).
 */
import { getAccessToken } from '@/lib/authApi';

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://docfilling-api.noetherip.com';

// DocProcessing now lives behind the patmimo-utilities proxy.
export const API_BASE_URL = `${BACKEND_URL}/api/DocProcessing`;

export const GENERATE_DOC_URL = `${API_BASE_URL}/generate`;
export const GENERATE_FROM_USPTO_URL = `${API_BASE_URL}/generate-from-uspto`;
export const IDS_TEMPLATE_URL = `${API_BASE_URL}/ids-excel-template`;
export const CLAIMS_API_BASE = `${API_BASE_URL}/claims`;

/** Bearer auth header for proxied DocProcessing calls. */
export function bearerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

export const REQUEST_TIMEOUT = Number(import.meta.env.VITE_REQUEST_TIMEOUT ?? 60000);
