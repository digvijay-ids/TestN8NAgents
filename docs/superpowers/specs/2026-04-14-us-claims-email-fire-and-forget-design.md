# US Compliant Claims — Email + Fire-and-Forget

## Overview

Update the US Compliant Claims page to collect a required user email and change the N8N webhook call (step 2) to fire-and-forget. The backend will process the claims and email results to the user asynchronously.

## Changes

### 1. ClaimsPage (`src/pages/ClaimsPage.tsx`)

**Add email input field:**
- Position: below PCT number field
- Required field, validated with standard email regex
- Error message: "Please enter a valid email address"
- Placeholder: `e.g., user@example.com`

**Submit button:**
- Disabled unless both PCT number and email are valid

**Post-submission UI:**
- After successful submission, replace the form with a success confirmation card
- Message: "Your request has been submitted. US compliant claims will be sent to {email}."
- "Submit Another" button to reset form and allow a new submission

**ClaimsComparison:**
- Keep the import and component file intact
- Do not render it — comment out the conditional rendering block
- Preserved for potential future re-enablement

### 2. useClaimsSearch hook (`src/hooks/useClaimsSearch.ts`)

**Signature change:**
- `fetchClaims(pctNumber: string, email: string)`

**Step 1 — Fetch WIPO claims:**
- No change. Still awaited. The claims data is needed for step 2's payload.

**Step 2 — N8N webhook (fire-and-forget):**
- Add `email` field to POST body: `{ claims: [...], email: "user@example.com" }`
- Do NOT await the fetch call — fire it and move on
- Catch errors silently (console.warn only)
- Immediately set `submitted: true` after firing

**New state:**
- Add `submitted: boolean` (default: `false`) to hook state and return value
- `reset()` also sets `submitted` back to `false`

### 3. API config (`src/config/api.ts`)

- No changes required

## Files Touched

| File | Change |
|------|--------|
| `src/pages/ClaimsPage.tsx` | Add email field, validation, success card, hide ClaimsComparison |
| `src/hooks/useClaimsSearch.ts` | Add email param, fire-and-forget step 2, `submitted` state |

## Data Flow

```
User enters PCT + email
    ↓
Submit (both validated)
    ↓
Brief loading state
    ↓
Step 1: await GET /api/DocProcessing/claims?pctNumber=X
    ↓
Step 2: fetch POST N8N webhook { claims, email } — NO await
    ↓
Set submitted = true immediately
    ↓
Show success confirmation card
```
