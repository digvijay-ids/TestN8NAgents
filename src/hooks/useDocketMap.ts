import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  getSnapshot,
  parseDocketXml,
  mergeDocketMap,
  normalizeAppNumber,
  type DocketMap,
} from '@/lib/docketMap';

export function useDocketMap() {
  const map = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const lookup = useCallback(
    (appNumber: string): string | undefined => map[normalizeAppNumber(appNumber)],
    [map],
  );

  const mergeFromXml = useCallback(async (file: File): Promise<number> => {
    const text = await file.text();
    const entries: DocketMap = parseDocketXml(text);
    return mergeDocketMap(entries);
  }, []);

  return { map, lookup, mergeFromXml };
}
