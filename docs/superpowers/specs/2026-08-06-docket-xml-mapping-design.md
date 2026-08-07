# Docket XML Mapping on Continuity Page — Design

**Date:** 2026-08-06
**Status:** Approved

## Problem

The Continuity page displays USPTO application numbers (e.g. `18210593`) fetched from
the USPTO API. Users think in terms of internal attorney **docket numbers**, not raw
application numbers. USPTO provides an "Applications By Customer" XML export that pairs
each application ID with its attorney docket number. We want users to upload that XML,
persist the mapping locally, and see the docket number alongside every application
number in the continuity view.

## Source Data

The export file (`ApplicationsByCustomer-*.xml`) has this shape:

```xml
<PairCustomerList>
  <PairCustomer>
    <applId>64095827</applId>
    <attyDktNo>PLDM-P001-prov</attyDktNo>
    <!-- ...other fields ignored... -->
  </PairCustomer>
  <PairCustomer>
    <applId>PCT/US26/37123</applId>
    <attyDktNo>SYG-MO-P01A</attyDktNo>
  </PairCustomer>
  ...
</PairCustomerList>
```

Only `applId` and `attyDktNo` are consumed. All other fields are ignored.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| Placement | Upload control on the Continuity page. Dockets shown in the continuity tree nodes and the search-result header. |
| Matching | Digits-only normalization: strip all non-digits from both the XML `applId` and the tree app number, then compare. |
| Upload behavior | Merge / accumulate — new entries update or add to the existing localStorage map; prior uploads are retained. |
| Display | Docket rendered as secondary mono text beside the application number, e.g. `18/210593 · SYG-MO-P01A`. |

## Architecture

### `src/lib/docketMap.ts` (new)

Pure logic plus a module-level reactive store.

- `normalizeAppNumber(value: string): string`
  Strips every non-digit character. `"PCT/US26/37123"` → `"2637123"`, `"18/210593"` → `"18210593"`.

- `parseDocketXml(xmlText: string): Record<string, string>`
  Uses the browser `DOMParser`. Iterates every `<PairCustomer>`, reads `applId` and
  `attyDktNo`. Builds `{ normalizedApplId: docket }`. Skips entries where the normalized
  app id is empty or the docket is blank. Throws a descriptive `Error` when the document
  fails to parse or contains no `<PairCustomer>` elements (so the caller can toast it).

- Storage: localStorage key `patmemo:docketMap`, JSON `Record<string,string>`.
  - `loadDocketMap()` — read + JSON.parse, returns `{}` on missing/corrupt data.
  - `mergeDocketMap(entries)` — shallow-merge into the stored map (new keys win),
    persist, notify subscribers.
  - `getDocket(appNumber)` — normalize then look up; returns `string | undefined`.

- Reactive store via `useSyncExternalStore` primitives:
  - `subscribe(cb)` / `getSnapshot()` returning the current map object (stable reference
    between mutations so `useSyncExternalStore` doesn't loop).

### `src/hooks/useDocketMap.ts` (new)

Thin React wrapper:

```ts
function useDocketMap(): {
  map: Record<string, string>;
  lookup: (appNumber: string) => string | undefined;
  mergeFromXml: (file: File) => Promise<number>; // resolves with count merged
}
```

`mergeFromXml` reads the file text, calls `parseDocketXml`, `mergeDocketMap`, and returns
the number of entries merged (for the toast). Parse errors propagate to the caller.

### `src/pages/ContinuityPage.tsx` (edit)

- Add a hidden `<input type="file" accept=".xml,text/xml">` plus a labeled button
  ("Upload docket XML") — shown both on the initial search card and next to
  "New search" in the results header.
- On file selection: `await mergeFromXml(file)`, then success toast
  ("N docket numbers mapped") or error toast on throw. Reset the input value so the same
  file can be re-selected.
- Pass nothing extra to the tree — the tree reads the hook itself (live updates).

### `src/components/ContinuityTree.tsx` (edit)

- Call `useDocketMap()`.
- For each node's `appNumber`, `lookup(appNumber)`; when present, render the docket as
  secondary mono text beside the formatted app number (`· SYG-MO-P01A`), styled with
  `text-muted-foreground`.
- Apply the same in the queried-application header in ContinuityPage.

## Data Flow

```
File → mergeFromXml → parseDocketXml (DOMParser) → normalize applIds
     → mergeDocketMap → localStorage + notify subscribers
     → useSyncExternalStore re-renders tree/header → getDocket per node → mono label
```

## Error Handling

- Malformed XML or no `<PairCustomer>` → `parseDocketXml` throws → error toast, stored map
  unchanged.
- Corrupt localStorage JSON → `loadDocketMap` returns `{}` (fail-safe, no crash).
- App number with no mapping → no label rendered (silent).

## Testing

Unit tests (Vitest) for `docketMap.ts`:
- `normalizeAppNumber` strips non-digits across numeric, slash, and PCT forms.
- `parseDocketXml` extracts pairs from a representative fixture, skips blank docket/appId,
  throws on empty/invalid input.
- `mergeDocketMap` accumulates across two merges (new keys added, overlapping keys
  overwritten) and persists to localStorage.
- `getDocket` matches a formatted tree number (`18210593`) against a stored numeric key.

## Out of Scope

- No server persistence — localStorage only.
- No editing/deleting individual mappings in the UI.
- No PCT-specific exact matching (digits-only accepted, rare false match tolerated).
- No display of other XML fields (status, dates, examiner).
