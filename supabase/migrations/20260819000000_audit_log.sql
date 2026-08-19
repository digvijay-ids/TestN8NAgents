-- Super-admin audit log: append-only trail of every request against the auth/admin
-- backend. Writes happen server-side with the service_role key (bypasses RLS), so
-- actors cannot forge or erase their own trail. Applied to project jvkxdlhkqcqjhqqemxjd.

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  actor_id     uuid,                 -- null for pre-auth failures (bad/expired token)
  actor_email  text,                 -- denormalized for display without a join
  actor_name   text,                 -- resolved full name (email fallback) for display
  summary      text,                 -- human sentence, e.g. "Digvijay Singh logged in successfully"
  method       text not null,
  path         text not null,
  status_code  int  not null,
  action       text,                 -- e.g. user.deactivate
  target_id    text,                 -- affected entity id
  detail       jsonb,                -- redacted change detail, e.g. {"is_active": false}
  ip           text,
  user_agent   text,
  duration_ms  int
);

alter table public.audit_log enable row level security;

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_id_idx   on public.audit_log (actor_id);
create index if not exists audit_log_action_idx     on public.audit_log (action);

-- RLS: super-admins may read. No insert/update/delete policy exists, so the Data API
-- cannot write or erase rows; only the service_role key (which bypasses RLS) can insert.
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (public.is_super_admin());

-- Select grant only. RLS still restricts rows to super-admins. No write grants.
grant select on public.audit_log to authenticated;

-- Retention: daily purge of entries older than 90 days via pg_cron. Re-schedule to
-- change the window (pg_cron cannot read app env vars). If pg_cron is unavailable,
-- run the DELETE below on an external schedule instead.
create extension if not exists pg_cron;

select cron.unschedule('audit_log_retention')
  where exists (select 1 from cron.job where jobname = 'audit_log_retention');

select cron.schedule(
  'audit_log_retention',
  '0 3 * * *',
  $$delete from public.audit_log where created_at < now() - interval '90 days'$$
);
