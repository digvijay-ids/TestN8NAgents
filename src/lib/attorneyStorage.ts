import { Attorney } from '@/types/attorney';

const STORAGE_KEY = 'selectedAttorney';

/** Load the persisted attorney, or null if none / invalid. */
export function loadAttorney(): Attorney | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.regNumber === 'string' && typeof parsed.name === 'string') {
      return parsed as Attorney;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the selected attorney. */
export function saveAttorney(attorney: Attorney): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attorney));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** Remove the persisted attorney selection. */
export function clearAttorney(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
