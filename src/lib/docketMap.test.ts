import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeAppNumber,
  parseDocketXml,
  mergeDocketMap,
  getDocket,
  getSnapshot,
  resetDocketMapForTest,
} from './docketMap';

const XML = `<?xml version="1.0"?><PairCustomerList>
  <PairCustomer><applId>64095827</applId><attyDktNo>PLDM-P001-prov</attyDktNo></PairCustomer>
  <PairCustomer><applId>PCT/US26/37123</applId><attyDktNo>SYG-MO-P01A</attyDktNo></PairCustomer>
  <PairCustomer><applId>18/210593</applId><attyDktNo>  DKT-TRIM  </attyDktNo></PairCustomer>
  <PairCustomer><applId></applId><attyDktNo>NO-APPID</attyDktNo></PairCustomer>
  <PairCustomer><applId>99999999</applId><attyDktNo></attyDktNo></PairCustomer>
</PairCustomerList>`;

beforeEach(() => resetDocketMapForTest());

describe('normalizeAppNumber', () => {
  it('strips all non-digits', () => {
    expect(normalizeAppNumber('18/210593')).toBe('18210593');
    expect(normalizeAppNumber('PCT/US26/37123')).toBe('2637123');
    expect(normalizeAppNumber('64095827')).toBe('64095827');
  });
});

describe('parseDocketXml', () => {
  it('extracts pairs, normalizes ids, trims dockets', () => {
    const map = parseDocketXml(XML);
    expect(map['64095827']).toBe('PLDM-P001-prov');
    expect(map['2637123']).toBe('SYG-MO-P01A');
    expect(map['18210593']).toBe('DKT-TRIM');
  });
  it('skips rows with blank appId or blank docket', () => {
    const map = parseDocketXml(XML);
    expect(Object.keys(map)).toHaveLength(3);
    expect(map['99999999']).toBeUndefined();
  });
  it('throws on XML with no PairCustomer rows', () => {
    expect(() => parseDocketXml('<PairCustomerList></PairCustomerList>')).toThrow();
  });
  it('throws on unparseable input', () => {
    expect(() => parseDocketXml('not xml <<<')).toThrow();
  });
});

describe('mergeDocketMap + getDocket', () => {
  it('accumulates across merges and overwrites overlapping keys', () => {
    expect(mergeDocketMap({ '111': 'A', '222': 'B' })).toBe(2);
    mergeDocketMap({ '222': 'B2', '333': 'C' });
    expect(getDocket('111')).toBe('A');
    expect(getDocket('222')).toBe('B2');
    expect(getDocket('333')).toBe('C');
  });
  it('matches formatted app numbers against stored numeric keys', () => {
    mergeDocketMap({ '18210593': 'FMT' });
    expect(getDocket('18/210593')).toBe('FMT');
  });
  it('persists to localStorage', () => {
    mergeDocketMap({ '111': 'A' });
    expect(localStorage.getItem('patmemo:docketMap')).toContain('111');
  });
  it('changes snapshot reference on merge', () => {
    const before = getSnapshot();
    mergeDocketMap({ '111': 'A' });
    expect(getSnapshot()).not.toBe(before);
  });
});
