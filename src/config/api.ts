/**
 * API Configuration
 * Values come from environment variables (see .env / .env.example).
 * Vite exposes only vars prefixed with VITE_ via import.meta.env.
 */

// Base API endpoint for document processing
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7196/api/DocProcessing';

// Generate endpoint URL
export const GENERATE_DOC_URL = `${API_BASE_URL}/generate`;

// Claims endpoint URL
export const CLAIMS_API_BASE = `${API_BASE_URL}/claims`;

// Basic auth credentials for the DocProcessing API
const API_BASIC_AUTH_USER = import.meta.env.VITE_API_BASIC_AUTH_USER ?? '';
const API_BASIC_AUTH_PASS = import.meta.env.VITE_API_BASIC_AUTH_PASS ?? '';

// Authorization header (empty when no credentials configured)
export const AUTH_HEADER: Record<string, string> =
  API_BASIC_AUTH_USER || API_BASIC_AUTH_PASS
    ? { Authorization: `Basic ${btoa(`${API_BASIC_AUTH_USER}:${API_BASIC_AUTH_PASS}`)}` }
    : {};

// Request headers for JSON POST requests
export const API_HEADERS: Record<string, string> = {
  Accept: '*/*',
  'Content-Type': 'application/json',
  ...AUTH_HEADER,
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = Number(import.meta.env.VITE_REQUEST_TIMEOUT ?? 60000);
