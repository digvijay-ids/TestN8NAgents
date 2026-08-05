# App Authentication & Access Management — Design

**Date:** 2026-08-06
**Status:** Approved (autonomous execution authorized by user)

## Problem

The TestN8NAgents SPA is currently open — anyone reaching the deployed site can
use every page. We must lock the whole application behind authentication, add
role-based + per-user page access control, allow admins to manage users/roles/
access, and allow individual pages to be marked public.

## Locked Decisions

| Topic | Decision |
| --- | --- |
| Backend | Supabase (Auth + Postgres + RLS), connected via Supabase MCP. |
| Auth method | Email + password (Supabase Auth). |
| Onboarding | Admin-only. No public sign-up. Admin creates users + assigns access. |
| Access model | Roles→pages **plus** per-user page overrides (allow/deny). Super-admin bypasses all checks. |
| Public pages | Any page can be flagged public (no auth required). Login/landing always public. |
| Default state | All feature pages private; a public landing/login route exists. |
| Super-admin | `digvijay.singh@iotaanlytics.com`, bootstrapped with a temporary password (reset on first login). |

## Data Model (Postgres, schema `public`, RLS on every table)

- `profiles` — `id uuid PK → auth.users(id)`, `email text`, `full_name text`,
  `is_active bool default true`, `created_at timestamptz`. One row per auth user.
  Authorization flag `is_super_admin` is stored in **`auth.users.raw_app_meta_data`**
  (app_metadata), NOT in profiles/user_metadata — app_metadata is not user-editable
  and is safe for authz (per Supabase security checklist).
- `roles` — `id uuid PK`, `name text unique`, `description text`, `created_at`.
- `pages` — `id uuid PK`, `path text unique` (e.g. `/continuity`), `label text`,
  `is_public bool default false`, `sort_order int`, `created_at`. Seeded with the
  app's routes.
- `role_pages` — `role_id → roles`, `page_id → pages`, PK(role_id, page_id).
  Grants a page to a role.
- `user_roles` — `user_id → profiles`, `role_id → roles`, PK(user_id, role_id).
  Assigns roles to users.
- `user_page_overrides` — `user_id → profiles`, `page_id → pages`,
  `access text check (access in ('allow','deny'))`, PK(user_id, page_id).
  Per-user override; **deny wins** over any role grant.

### Access resolution (authoritative, server-side)

A SQL helper decides access for the current user + a page path:

```
is_super_admin(auth.uid())                         → allow (everything)
page.is_public                                     → allow
override = 'deny'                                   → deny
override = 'allow'                                  → allow
exists role_pages via user_roles for that page     → allow
otherwise                                           → deny
```

Implemented as `public.can_access_page(p_path text) returns boolean`,
`SECURITY INVOKER`, reading `auth.uid()`. A companion
`public.my_pages() returns setof pages` returns every page the current user may
see (drives the sidebar). Super-admin check reads `auth.jwt() -> app_metadata`.

### RLS policy summary

- `profiles`: a user selects/updates **their own** row (`id = auth.uid()`);
  super-admin selects/updates/deletes all. Insert handled by a trigger on
  `auth.users` (creates the profile row) — no client insert.
- `roles`, `pages`, `role_pages`, `user_roles`, `user_page_overrides`:
  **SELECT** allowed to `authenticated` (needed to render UI/resolve access);
  **INSERT/UPDATE/DELETE** only for super-admin (checked via app_metadata).
  `pages.is_public` readable by `anon` too (so public routes resolve pre-login) —
  a dedicated policy `TO anon USING (is_public = true)` on `pages`.
- All admin writes go through RLS; no `service_role` key is ever shipped to the
  browser. Admin user-creation (which needs the Admin API) is done at bootstrap
  time via MCP, and ongoing "admin creates user" uses a Supabase **Edge Function**
  (`admin-create-user`) guarded by a super-admin app_metadata check, invoked with
  the caller's JWT. (If Edge Function deploy is unavailable, fall back:
  admin-invite via dashboard + document it; the app still manages roles/access.)

## Frontend (React + Vite + react-router)

- **Dependency:** `@supabase/supabase-js` (pinned, lockfile committed).
- `src/lib/supabaseClient.ts` — singleton client from `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (publishable/anon key only).
- `src/context/AuthContext.tsx` — holds `session`, `user`, `profile`,
  `isSuperAdmin`, `accessiblePaths` (from `my_pages()`), `loading`; subscribes to
  `onAuthStateChange`; exposes `signIn`, `signOut`.
- `src/pages/LoginPage.tsx` — public. Email+password form → `signInWithPassword`.
- `src/pages/LandingPage.tsx` — public landing at `/` (marketing/entry + login CTA).
- `src/components/ProtectedRoute.tsx` — wraps private routes. Rules:
  - page public → render.
  - not authenticated → redirect `/login`.
  - authenticated but path not in `accessiblePaths` and not super-admin →
    render `NoAccess` (403) view.
  - else render.
- `src/pages/admin/` — super-admin only:
  - `UsersAdminPage` — list users, create user (email+temp password via Edge fn),
    activate/deactivate, assign roles, set per-user page overrides.
  - `RolesAdminPage` — CRUD roles, toggle role→page grants.
  - `PagesAdminPage` — list pages, toggle `is_public`, edit label/sort.
- `src/components/AppSidebar.tsx` — render only pages in `accessiblePaths`
  (+ Admin section when super-admin). Add sign-out.
- `src/App.tsx` — wrap routes: public (`/`, `/login`) outside guard; all Layout
  routes inside `ProtectedRoute`; add `/admin/*` guarded by super-admin.

## Bootstrap (one-time, via MCP)

1. Create/confirm a Supabase project; capture URL + anon key → `.env`.
2. Apply schema + RLS + functions + triggers (SQL via MCP `execute_sql`,
   then commit as a migration).
3. Seed `pages` from current routes; seed a default `admin` role granting all
   pages and a `member` role (no pages by default).
4. Create super-admin auth user (`digvijay.singh@iotaanlytics.com`) with a temp
   password; set `raw_app_meta_data.is_super_admin = true`; assign `admin` role.
5. Report the temp password to the user for first-login reset.

## Security Requirements (from Supabase checklist)

- Authorization via `app_metadata` only — never `user_metadata`.
- Every `public` table has RLS enabled with real policies (not blanket `auth.uid()`).
- No `service_role`/secret key in client code; anon/publishable key only.
- UPDATE policies include both `USING` and `WITH CHECK`.
- Any `SECURITY DEFINER` function (if used) lives outside exposed schema or has an
  internal `auth.uid()`/super-admin check; prefer `SECURITY INVOKER`.
- Run `get_advisors` (security) after schema changes; fix findings before locking.
- Pin `@supabase/supabase-js`; commit lockfile.

## Testing

- SQL: verify `can_access_page` for super-admin (all), public page (anon+auth),
  role-granted page, override deny-beats-role, and no-access default — via MCP
  `execute_sql` with `set local role` / JWT claim simulation where feasible.
- Frontend: unit-test `ProtectedRoute` decision logic (public / unauth / no-access
  / allowed / super-admin) with a mocked AuthContext.
- Advisors: security advisors clean (or documented) before completion.

## Out of Scope

- OAuth/social login, magic links, MFA.
- Public self-service sign-up.
- Row-level data ownership beyond page access (feature pages' own data
  unchanged).
- Audit logging of admin actions (can be a follow-up).

## Rollout / "Lock the system"

After implementation + verification: ensure all feature routes are wrapped by
`ProtectedRoute`, no route bypasses the guard, default `pages.is_public=false`
for feature pages, build passes, and advisors are clean. Then the app is locked:
unauthenticated users only reach `/` and `/login`.
