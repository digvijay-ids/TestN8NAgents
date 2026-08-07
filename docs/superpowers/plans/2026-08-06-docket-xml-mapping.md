# Docket XML Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a USPTO "Applications By Customer" XML on the Continuity page, persist an application-number→docket map in localStorage, and show docket numbers beside every application number in the continuity view.

**Architecture:** A framework-free module (`src/lib/docketMap.ts`) owns parsing, a localStorage-backed map, and a `useSyncExternalStore` subscription. A thin hook (`src/hooks/useDocketMap.ts`) exposes `map`/`lookup`/`mergeFromXml` to React. The Continuity page gets an upload button; the tree and the queried-application header read the hook and render a mono docket label when a mapping exists.

**Tech Stack:** React 18 + TypeScript, Vite, react-router, shadcn/ui, sonner (toasts), Vitest + @testing-library/react (added in Task 1).

## Global Constraints

- Path alias: `@` → `./src` (already configured in `vite.config.ts`).
- localStorage key: `patmemo:docketMap` (exact string).
- App-number matching: digits-only normalization (`String.replace(/\D/g, '')`) on both sides.
- Upload merges into (never replaces) the stored map.
- Docket rendered as secondary mono text: `· <DOCKET>` in `text-muted-foreground`.
- Toasts use sonner: `import { toast } from 'sonner'` (`<Sonner />` is already mounted in `App.tsx`).
- Node ≥ 18. Package manager: npm.

---

### Task 1: Add Vitest test infrastructure

**Files:**
- Modify: `package.json` (add devDependencies + `test` script)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/smoke.test.ts` (temporary, deleted in Step 6)

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npx vitest run` command and jsdom + `@testing-library/jest-dom` matchers for later tasks.

- [ ] **Step 1: Install test dependencies**

Run:
```bash
cd "C:/Digvijay/PatMemo/Code/TestN8NAgents"
npm install -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/dom@^10 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```
Expected: installs complete, `package.json` devDependencies updated.

- [ ] **Step 2: Add the `test` script to `package.json`**

In the `"scripts"` block add:
```json
    "test": "vitest",
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create a smoke test `src/lib/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs and localStorage exists', () => {
    localStorage.setItem('x', '1');
    expect(localStorage.getItem('x')).toBe('1');
  });
});
```

Run: `npx vitest run src/lib/smoke.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/smoke.test.ts
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "test: add vitest + testing-library infrastructure"
```

---

### Task 2: docketMap core module (parse, store, merge, lookup)

**Files:**
- Create: `src/lib/docketMap.ts`
- Test: `src/lib/docketMap.test.ts`

**Interfaces:**
- Consumes: browser `DOMParser`, `localStorage` (both present under jsdom).
- Produces (relied on by Tasks 3–5):
  - `type DocketMap = Record<string, string>`
  - `normalizeAppNumber(value: string): string`
  - `parseDocketXml(xmlText: string): DocketMap` — throws `Error` on unparseable XML or zero `<PairCustomer>` rows
  - `mergeDocketMap(entries: DocketMap): number` — merges, persists, notifies; returns count of `entries`
  - `getDocket(appNumber: string): string | undefined`
  - `subscribe(listener: () => void): () => void`
  - `getSnapshot(): DocketMap` — stable ref between merges
  - `resetDocketMapForTest(): void` — clears store + storage (test-only)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/docketMap.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/docketMap.test.ts`
Expected: FAIL — "Failed to resolve import './docketMap'" / functions not defined.

- [ ] **Step 3: Implement `src/lib/docketMap.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/docketMap.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/docketMap.ts src/lib/docketMap.test.ts
git commit -m "feat: docketMap parse/store/merge/lookup module"
```

---

### Task 3: useDocketMap hook

**Files:**
- Create: `src/hooks/useDocketMap.ts`
- Test: `src/hooks/useDocketMap.test.tsx`

**Interfaces:**
- Consumes (from Task 2): `subscribe`, `getSnapshot`, `parseDocketXml`, `mergeDocketMap`, `normalizeAppNumber`.
- Produces (relied on by Tasks 4–5):
  - `useDocketMap(): { map: DocketMap; lookup: (appNumber: string) => string | undefined; mergeFromXml: (file: File) => Promise<number> }`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useDocketMap.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useDocketMap.test.tsx`
Expected: FAIL — cannot resolve `./useDocketMap`.

- [ ] **Step 3: Implement `src/hooks/useDocketMap.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useDocketMap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDocketMap.ts src/hooks/useDocketMap.test.tsx
git commit -m "feat: useDocketMap hook over docketMap store"
```

---

### Task 4: Show docket label in ContinuityTree

**Files:**
- Modify: `src/components/ContinuityTree.tsx`
- Test: `src/components/ContinuityTree.test.tsx`

**Interfaces:**
- Consumes (from Task 3): `useDocketMap().lookup`.
- Produces: docket label beside each node's app number. No exported API change.

- [ ] **Step 1: Write the failing test**

Create `src/components/ContinuityTree.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContinuityTree } from './ContinuityTree';
import { resetDocketMapForTest, mergeDocketMap } from '@/lib/docketMap';
import type { PatentFileWrapper } from '@/types/continuity';

beforeEach(() => resetDocketMapForTest());

const wrapper: PatentFileWrapper = {
  applicationNumberText: '18210593',
  parentContinuityBag: [
    {
      parentApplicationNumberText: '16394220',
      parentApplicationFilingDate: '2019-04-25',
      parentApplicationStatusCode: 150,
      parentApplicationStatusDescriptionText: 'Patented',
      childApplicationNumberText: '18210593',
    },
  ],
};

describe('ContinuityTree docket labels', () => {
  it('renders docket next to a mapped app number', () => {
    mergeDocketMap({ '16394220': 'PARENT-DKT', '18210593': 'CHILD-DKT' });
    render(<ContinuityTree wrapper={wrapper} />);
    expect(screen.getByText(/PARENT-DKT/)).toBeInTheDocument();
    expect(screen.getByText(/CHILD-DKT/)).toBeInTheDocument();
  });

  it('renders no docket text when unmapped', () => {
    render(<ContinuityTree wrapper={wrapper} />);
    expect(screen.queryByText(/PARENT-DKT/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ContinuityTree.test.tsx`
Expected: FAIL — "PARENT-DKT" not found (labels not rendered yet).

- [ ] **Step 3: Add the import and hook call**

In `src/components/ContinuityTree.tsx`, add the import near the other imports (top of file):
```tsx
import { useDocketMap } from '@/hooks/useDocketMap';
```

Inside `export function ContinuityTree({ wrapper }: ContinuityTreeProps) {`, add as the first line of the body:
```tsx
  const { lookup } = useDocketMap();
```

- [ ] **Step 4: Render the docket label in each node**

In the node map, replace this block:
```tsx
                    <span className="font-mono text-base font-semibold tracking-tight">
                      {formatAppNumber(node.appNumber)}
                      {node.isCurrent && (
```
with:
```tsx
                    <span className="font-mono text-base font-semibold tracking-tight">
                      {formatAppNumber(node.appNumber)}
                      {lookup(node.appNumber) && (
                        <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                          · {lookup(node.appNumber)}
                        </span>
                      )}
                      {node.isCurrent && (
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ContinuityTree.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Commit**

```bash
git add src/components/ContinuityTree.tsx src/components/ContinuityTree.test.tsx
git commit -m "feat: show docket labels in continuity tree nodes"
```

---

### Task 5: Upload control + header docket on ContinuityPage

**Files:**
- Modify: `src/pages/ContinuityPage.tsx`
- Test: `src/pages/ContinuityPage.test.tsx`

**Interfaces:**
- Consumes (from Task 3): `useDocketMap().lookup`, `useDocketMap().mergeFromXml`.
- Produces: an "Upload docket XML" control (initial card + results header) and a docket label beside the queried application number in the results header.

- [ ] **Step 1: Write the failing test**

Create `src/pages/ContinuityPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContinuityPage from './ContinuityPage';
import { resetDocketMapForTest, mergeDocketMap } from '@/lib/docketMap';

// sonner renders a portal we don't assert on; stub it to keep the DOM clean.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => resetDocketMapForTest());

const XML = `<?xml version="1.0"?><PairCustomerList>
  <PairCustomer><applId>18210593</applId><attyDktNo>UPLOAD-DKT</attyDktNo></PairCustomer>
</PairCustomerList>`;

describe('ContinuityPage upload', () => {
  it('shows an upload control on the initial search card', () => {
    render(<ContinuityPage />);
    expect(screen.getByText(/Upload docket XML/i)).toBeInTheDocument();
  });

  it('merges an uploaded XML into the docket map', async () => {
    render(<ContinuityPage />);
    const input = screen.getByTestId('docket-xml-input') as HTMLInputElement;
    const file = new File([XML], 'export.xml', { type: 'text/xml' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      // stored map updated
      expect(localStorage.getItem('patmemo:docketMap')).toContain('UPLOAD-DKT');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ContinuityPage.test.tsx`
Expected: FAIL — "Upload docket XML" / `docket-xml-input` not found.

- [ ] **Step 3: Add imports, hook, ref, and upload handler**

In `src/pages/ContinuityPage.tsx`:

Change the React import on line 1 to include `useRef`:
```tsx
import { useState, useRef } from 'react';
```

Add these imports after the existing type import (line 8 area):
```tsx
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useDocketMap } from '@/hooks/useDocketMap';
```

Inside the component, after the existing `useState` lines, add:
```tsx
  const { lookup, mergeFromXml } = useDocketMap();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const count = await mergeFromXml(file);
      toast.success(`${count} docket number${count === 1 ? '' : 's'} mapped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to read the XML file');
    }
  };
```

- [ ] **Step 4: Add the hidden input + upload buttons and the header docket label**

Add the hidden input as the first child inside the outermost `return (<div ...>` (immediately after the opening `<div className="p-4 md:p-6">`):
```tsx
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        data-testid="docket-xml-input"
        className="hidden"
        onChange={handleFileChange}
      />
```

On the initial search card, add an upload button below the search `<Button>` (after the closing `</Button>` that ends the submit button, still inside the `<form>`):
```tsx
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleUploadClick}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload docket XML
                </Button>
```

In the results header, replace the "New search" button block:
```tsx
              <Button variant="outline" size="sm" onClick={handleNewSearch}>
                New search
              </Button>
```
with a group that adds the upload action:
```tsx
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload docket XML
                </Button>
                <Button variant="outline" size="sm" onClick={handleNewSearch}>
                  New search
                </Button>
              </div>
```

In the results header title, add the docket label after the app-number span. Replace:
```tsx
                Continuity chain for application{' '}
                <span className="font-mono">{wrapper.applicationNumberText}</span>
```
with:
```tsx
                Continuity chain for application{' '}
                <span className="font-mono">{wrapper.applicationNumberText}</span>
                {lookup(wrapper.applicationNumberText) && (
                  <span className="ml-2 font-mono text-lg font-normal text-muted-foreground">
                    · {lookup(wrapper.applicationNumberText)}
                  </span>
                )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/ContinuityPage.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Run the full suite + lint**

Run:
```bash
npx vitest run
npm run lint
```
Expected: all tests PASS; lint reports no new errors in changed files.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ContinuityPage.tsx src/pages/ContinuityPage.test.tsx
git commit -m "feat: upload docket XML + header docket on Continuity page"
```

---

### Task 6: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Open the app, navigate to `/continuity`.

- [ ] **Step 2: Upload and verify**

1. Click "Upload docket XML", pick `ApplicationsByCustomer-08-03-2026_06_19_12.xml`.
2. Confirm a success toast shows the mapped count.
3. Search an application number known to be in the XML (a plain 7–8 digit `applId`, e.g. `64095827`) or any app whose continuity chain includes a mapped number.
4. Confirm the docket appears as `· <DOCKET>` beside the app number in the header and any matching tree node.
5. Reload the page, search again — docket labels still appear (localStorage persisted).
6. Upload a second XML — earlier mappings remain (merge, not replace).

- [ ] **Step 3: Commit any doc updates** (if screenshots/notes added; otherwise skip)

---

## Self-Review

**Spec coverage:**
- Upload control on Continuity page → Task 5. ✓
- Parse `applId`/`attyDktNo`, ignore other fields → Task 2 `parseDocketXml`. ✓
- Digits-only normalization → Task 2 `normalizeAppNumber`, used in `getDocket`/`lookup`. ✓
- Merge/accumulate in localStorage key `patmemo:docketMap` → Task 2 `mergeDocketMap`. ✓
- Live re-render after upload → Task 2 store + Task 3 `useSyncExternalStore`. ✓
- Docket shown in tree nodes → Task 4; in header → Task 5, as `· <DOCKET>` mono muted. ✓
- Error handling: bad XML / no rows → Task 2 throws, Task 5 error toast; corrupt storage → `loadFromStorage` returns `{}`. ✓
- Unit tests for normalize/parse/merge/getDocket → Task 2. ✓
- Out-of-scope items (server persistence, per-entry edit, PCT exact match, other fields) → not implemented. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands include expected output. ✓

**Type consistency:** `DocketMap`, `normalizeAppNumber`, `parseDocketXml`, `mergeDocketMap`, `getDocket`, `subscribe`, `getSnapshot`, `resetDocketMapForTest` defined in Task 2 and used with identical names/signatures in Tasks 3–5. Hook returns `{ map, lookup, mergeFromXml }` consumed unchanged in Tasks 4–5. ✓
