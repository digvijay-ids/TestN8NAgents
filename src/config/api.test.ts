import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/authApi', () => ({ getAccessToken: () => 'TESTTOKEN' }));

import { bearerHeaders, API_BASE_URL } from './api';

describe('api config', () => {
  it('builds bearer header with token', () => {
    expect(bearerHeaders()).toEqual({ Authorization: 'Bearer TESTTOKEN' });
  });

  it('merges extra headers', () => {
    expect(bearerHeaders({ 'Content-Type': 'application/json' })).toEqual({
      Authorization: 'Bearer TESTTOKEN',
      'Content-Type': 'application/json',
    });
  });

  it('points the base URL at the DocProcessing proxy', () => {
    expect(API_BASE_URL.endsWith('/api/DocProcessing')).toBe(true);
  });
});
