/**
 * API Configuration
 * Configure your API endpoint and headers here
 */

// Base API endpoint for document processing
export const API_BASE_URL = 'https://noetherip-d-doc-filling.azurewebsites.net/api/DocProcessing';

// Generate endpoint URL
export const GENERATE_DOC_URL = `${API_BASE_URL}/generate`;

// Request headers for JSON POST requests
export const API_HEADERS: Record<string, string> = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 60000;
