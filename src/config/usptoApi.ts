/**
 * USPTO application data API configuration.
 * Values come from environment variables (see .env / .env.example).
 */

export const USPTO_API_BASE_URL =
  import.meta.env.VITE_USPTO_API_BASE_URL ?? 'http://localhost:8000/api/uspto';

/** Continuity (parent/child) endpoint for a given application number. */
export function continuityUrl(applicationNumber: string): string {
  return `${USPTO_API_BASE_URL}/applications/${applicationNumber}/continuity`;
}

export const USPTO_REQUEST_TIMEOUT = Number(import.meta.env.VITE_REQUEST_TIMEOUT ?? 60000);
