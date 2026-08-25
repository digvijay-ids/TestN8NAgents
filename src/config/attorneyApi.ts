export const ATTORNEY_SEARCH_URL =
  import.meta.env.VITE_ATTORNEY_SEARCH_URL ??
  'https://docfilling-api.noetherip.com/api/attorneys/search';

export const USE_MOCK_ATTORNEY_API =
  import.meta.env.VITE_USE_MOCK_ATTORNEY_API === 'true';

export const ATTORNEY_REQUEST_TIMEOUT = Number(
  import.meta.env.VITE_ATTORNEY_REQUEST_TIMEOUT ?? 15000
);
