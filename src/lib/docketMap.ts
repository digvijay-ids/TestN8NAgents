export type DocketMap = Record<string, string>;

const STORAGE_KEY = 'patmemo:docketMap';

function loadFromStorage(): DocketMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as DocketMap;
    }
    return {};
  } catch {
    return {};
  }
}

let store: DocketMap = loadFromStorage();
const listeners = new Set<() => void>();

export function normalizeAppNumber(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

export function parseDocketXml(xmlText: string): DocketMap {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Could not parse the XML file.');
  }
  const rows = doc.querySelectorAll('PairCustomer');
  if (rows.length === 0) {
    throw new Error('No PairCustomer records found in the XML file.');
  }
  const result: DocketMap = {};
  rows.forEach((row) => {
    const applId = row.querySelector('applId')?.textContent ?? '';
    const docket = (row.querySelector('attyDktNo')?.textContent ?? '').trim();
    const key = normalizeAppNumber(applId);
    if (key && docket) result[key] = docket;
  });
  return result;
}

export function mergeDocketMap(entries: DocketMap): number {
  store = { ...store, ...entries };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / serialization errors */
  }
  listeners.forEach((l) => l());
  return Object.keys(entries).length;
}

export function getDocket(appNumber: string): string | undefined {
  return store[normalizeAppNumber(appNumber)];
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): DocketMap {
  return store;
}

export function resetDocketMapForTest(): void {
  store = {};
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
