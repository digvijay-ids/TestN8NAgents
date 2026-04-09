## Plan: Add Sidebar Navigation + US Compliant Claims Page

### Overview

Add a sidebar with two menu items ("Create Documents" and "US Compliant Claims"), move the existing document filing page under the first menu, and build a new claims comparison page under the second.

### Architecture

```text
App.tsx
└── SidebarProvider + Layout
    ├── AppSidebar (sidebar with 2 menu items)
    └── Routes
        ├── /create-documents  → existing SearchForm (Index page)
        └── /us-compliant-claims → new ClaimsPage
```

### Files to Create/Modify

**1. `src/components/AppSidebar.tsx**` (new)

- Sidebar with two menu items using existing shadcn Sidebar components
- "Create Documents" (icon: FileText) → `/create-documents`
- "US Compliant Claims" (icon: Scale/Gavel) → `/us-compliant-claims`
- Use `NavLink` for active state highlighting
- Collapsible with icon mode

**2. `src/components/Layout.tsx**` (new)

- Wraps `SidebarProvider` + `AppSidebar` + `SidebarTrigger` header + `<Outlet />`
- Full width layout with `min-h-screen flex w-full`

**3. `src/pages/ClaimsPage.tsx**` (new)

- PCT number input with same validation logic (extracted/reused)
- "Submit" button triggers two sequential API calls:
  - **API 1**: `GET https://noetherip-d-doc-filling.azurewebsites.net/api/DocProcessing/claims?pctNumber=...` — fetches WIPO claims
  - **API 2**: `POST https://n8n.noetherip.com/webhook/wipo-claims` — sends claims, receives US compliant claims
- After both calls complete, shows a split-panel comparison view

**4. `src/components/ClaimsComparison.tsx**` (new)

- Two-column layout (responsive: stacked on mobile)
- **Left panel**: "Original WIPO Claims" — read-only, numbered list
- **Right panel**: "Amended US Claims" — editable text areas per claim, with ability to add/delete claims/text
- "Copy Amended Claims" button in top-right copies all US claims text to clipboard
- Clean styling with distinct header colors for each panel (similar to screenshot but polished with shadcn)

**5. `src/hooks/useClaimsSearch.ts**` (new)

- Custom hook managing: loading state, error state, WIPO claims, US claims
- `fetchClaims(pctNumber)`:
  1. Call claims API (GET) with encoded PCT number
  2. Extract `claims` array, combine `plainText` by `claimId` to form full claim text
  3. POST the formatted claims to the n8n webhook
  4. Parse response: `input_claims` → left panel, `output_claims.claims_json` → right panel (editable)

**6. `src/App.tsx**` (modify)

- Wrap routes in `Layout` component
- Add route `/create-documents` → `Index`
- Add route `/us-compliant-claims` → `ClaimsPage`
- Redirect `/` → `/create-documents`

**7. `src/pages/Index.tsx**` (minor update)

- Remove outer `min-h-screen` centering (Layout handles it now)

### API Integration Details

- **Claims API (GET)**: URL-encode the PCT number as query param. Response contains `claims[]` with `plainText` per claim segment. Group by `claimId` and concatenate `plainText` to form full claim text.
- **N8N Webhook (POST)**: Send the assembled claims array. Response contains `output_claims.claims_json[]` with `claim_no` and `text`.
- Both calls use the existing timeout/error handling pattern from `useFileSearch`.

### UI for Claims Comparison

- Header bar: "WIPO → US Claims Comparison" with "Copy Amended Claims" button
- Left panel: dark blue header, white background, numbered claims (read-only)
- Right panel: orange header, white background, editable textareas per claim with add/delete controls
- Toast notification on successful copy