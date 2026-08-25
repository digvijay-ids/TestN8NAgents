/**
 * USPTO application data API configuration.
 * Values come from environment variables (see .env / .env.example).
 */

export const USPTO_API_BASE_URL =
  import.meta.env.VITE_USPTO_API_BASE_URL ?? 'https://docfilling-api.noetherip.com/api/uspto';

/** Continuity (parent/child) endpoint for a given application number. */
export function continuityUrl(applicationNumber: string): string {
  return `${USPTO_API_BASE_URL}/applications/${applicationNumber}/continuity`;
}

/**
 * Full patent-family endpoint: crawls every related application (ancestors,
 * descendants, and siblings/other continuations of shared parents) and returns
 * one merged continuity payload.
 */
export function familyUrl(applicationNumber: string): string {
  return `${USPTO_API_BASE_URL}/applications/${applicationNumber}/family`;
}

export const USPTO_REQUEST_TIMEOUT = Number(import.meta.env.VITE_REQUEST_TIMEOUT ?? 60000);
