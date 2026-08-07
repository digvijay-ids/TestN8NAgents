-- Auth & access management schema: profiles, roles, pages, role/user grants,
-- per-user overrides, access-resolution functions, and RLS.
-- Applied to project jvkxdlhkqcqjhqqemxjd via MCP; committed here for version control.

-- ============ Tables ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.roles enable row level security;

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  path text unique not null,
  label text not null,
  is_public boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.pages enable row level security;

create table if not exists public.role_pages (
  role_id uuid not null references public.roles(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  primary key (role_id, page_id)
);
alter table public.role_pages enable row level security;

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);
alter table public.user_roles enable row level security;

create table if not exists public.user_page_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  access text not null check (access in ('allow','deny')),
  primary key (user_id, page_id)
);
alter table public.user_page_overrides enable row level security;

-- ============ Authz helper (reads app_metadata from JWT; user_metadata is unsafe) ============
create or replace function public.is_super_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false);
$$;

-- ============ Profile auto-creation on new auth user ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
-- Trigger function must not be callable via the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Access resolution: deny override beats role grant; super-admin & public bypass ============
create or replace function public.can_access_page(p_path text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select case
    when public.is_super_admin() then true
    when exists (select 1 from public.pages pg where pg.path = p_path and pg.is_public) then true
    when exists (
      select 1 from public.user_page_overrides o
      join public.pages pg on pg.id = o.page_id
      where pg.path = p_path and o.user_id = auth.uid() and o.access = 'deny'
    ) then false
    when exists (
      select 1 from public.user_page_overrides o
      join public.pages pg on pg.id = o.page_id
      where pg.path = p_path and o.user_id = auth.uid() and o.access = 'allow'
    ) then true
    when exists (
      select 1 from public.user_roles ur
      join public.role_pages rp on rp.role_id = ur.role_id
      join public.pages pg on pg.id = rp.page_id
      where pg.path = p_path and ur.user_id = auth.uid()
    ) then true
    else false
  end;
$$;

create or replace function public.my_pages()
returns setof public.pages language sql stable security invoker set search_path = '' as $$
  select * from public.pages pg where public.can_access_page(pg.path) order by pg.sort_order;
$$;

-- ============ RLS policies ============
-- profiles
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_super_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- roles
create policy roles_select_auth on public.roles for select to authenticated using (true);
create policy roles_admin_all on public.roles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- pages
create policy pages_select_auth on public.pages for select to authenticated using (true);
create policy pages_select_public_anon on public.pages for select to anon using (is_public = true);
create policy pages_admin_all on public.pages for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- role_pages
create policy role_pages_select_auth on public.role_pages for select to authenticated using (true);
create policy role_pages_admin_all on public.role_pages for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- user_roles
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy user_roles_select_admin on public.user_roles for select to authenticated using (public.is_super_admin());
create policy user_roles_admin_all on public.user_roles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- user_page_overrides
create policy upo_select_own on public.user_page_overrides for select to authenticated using (user_id = (select auth.uid()));
create policy upo_select_admin on public.user_page_overrides for select to authenticated using (public.is_super_admin());
create policy upo_admin_all on public.user_page_overrides for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ============ Grants (RLS still governs rows) ============
grant usage on schema public to anon, authenticated;
grant select on public.pages to anon;
grant select, insert, update, delete on public.profiles, public.roles, public.pages, public.role_pages, public.user_roles, public.user_page_overrides to authenticated;
grant execute on function public.is_super_admin(), public.can_access_page(text), public.my_pages() to anon, authenticated;

-- ============ Seed pages + roles ============
insert into public.pages (path, label, is_public, sort_order) values
  ('/', 'Home', true, 0),
  ('/login', 'Login', true, 1),
  ('/create-documents', 'Create Documents', false, 2),
  ('/uspto-documents', 'USPTO Documents', false, 3),
  ('/continuity', 'Continuity', false, 4)
on conflict (path) do nothing;

insert into public.roles (name, description) values
  ('admin', 'Full access to all pages'),
  ('member', 'Base role, no page access by default')
on conflict (name) do nothing;

insert into public.role_pages (role_id, page_id)
select r.id, p.id from public.roles r cross join public.pages p
where r.name = 'admin' and p.is_public = false
on conflict do nothing;
