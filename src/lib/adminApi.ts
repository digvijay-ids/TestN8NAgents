import { supabase } from '@/lib/supabaseClient';
import type { Page, Profile, Role } from '@/types/access';

/**
 * Admin-only data access. All writes are governed server-side by RLS
 * (super-admin only). User creation goes through the `admin-create-user`
 * Edge Function, which holds the service_role key — never the browser.
 */

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return (data as Role[]) ?? [];
}

export async function listPages(): Promise<Page[]> {
  const { data, error } = await supabase.from('pages').select('*').order('sort_order');
  if (error) throw error;
  return (data as Page[]) ?? [];
}

export async function listUserRoles(): Promise<{ user_id: string; role_id: string }[]> {
  const { data, error } = await supabase.from('user_roles').select('user_id, role_id');
  if (error) throw error;
  return data ?? [];
}

export async function listRolePages(): Promise<{ role_id: string; page_id: string }[]> {
  const { data, error } = await supabase.from('role_pages').select('role_id, page_id');
  if (error) throw error;
  return data ?? [];
}

export async function listOverrides(): Promise<{ user_id: string; page_id: string; access: 'allow' | 'deny' }[]> {
  const { data, error } = await supabase.from('user_page_overrides').select('user_id, page_id, access');
  if (error) throw error;
  return data ?? [];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name?: string;
  role_ids?: string[];
  is_super_admin?: boolean;
}

export async function createUser(payload: CreateUserPayload): Promise<{ user_id: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { user_id: string };
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) throw error;
}

export async function setUserRoles(userId: string, roleIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (delErr) throw delErr;
  if (roleIds.length > 0) {
    const { error } = await supabase.from('user_roles').insert(roleIds.map((role_id) => ({ user_id: userId, role_id })));
    if (error) throw error;
  }
}

export async function setUserOverride(
  userId: string,
  pageId: string,
  access: 'allow' | 'deny' | null,
): Promise<void> {
  if (access === null) {
    const { error } = await supabase
      .from('user_page_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('page_id', pageId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('user_page_overrides')
    .upsert({ user_id: userId, page_id: pageId, access }, { onConflict: 'user_id,page_id' });
  if (error) throw error;
}

export async function createRole(name: string, description: string): Promise<void> {
  const { error } = await supabase.from('roles').insert({ name, description: description || null });
  if (error) throw error;
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) throw error;
}

export async function setRolePages(roleId: string, pageIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('role_pages').delete().eq('role_id', roleId);
  if (delErr) throw delErr;
  if (pageIds.length > 0) {
    const { error } = await supabase.from('role_pages').insert(pageIds.map((page_id) => ({ role_id: roleId, page_id })));
    if (error) throw error;
  }
}

export async function updatePage(
  pageId: string,
  patch: Partial<Pick<Page, 'is_public' | 'label' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase.from('pages').update(patch).eq('id', pageId);
  if (error) throw error;
}
