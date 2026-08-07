import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocketMap } from './useDocketMap';
import { resetDocketMapForTest } from '@/lib/docketMap';

beforeEach(() => resetDocketMapForTest());

const XML = `<?xml version="1.0"?><PairCustomerList>
  <PairCustomer><applId>18210593</applId><attyDktNo>ACME-1</attyDktNo></PairCustomer>
</PairCustomerList>`;

describe('useDocketMap', () => {
  it('lookup returns undefined before any upload', () => {
    const { result } = renderHook(() => useDocketMap());
    expect(result.current.lookup('18210593')).toBeUndefined();
  });

  it('mergeFromXml populates the map and lookup matches formatted numbers', async () => {
    const { result } = renderHook(() => useDocketMap());
    const file = new File([XML], 'export.xml', { type: 'text/xml' });
    let count = 0;
    await act(async () => {
      count = await result.current.mergeFromXml(file);
    });
    expect(count).toBe(1);
    await waitFor(() => expect(result.current.lookup('18/210593')).toBe('ACME-1'));
  });
});
