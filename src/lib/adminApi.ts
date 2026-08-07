import { apiJson } from '@/lib/authApi';
import type { Page, Profile, Role } from '@/types/access';

/**
 * Admin data access via the patmimo-utilities backend (/api/admin/*).
 * All calls carry the caller's bearer token; the server enforces super-admin
 * (and Postgres RLS enforces it again).
 */

interface UserRow extends Profile {
  role_ids: string[];
}

export async function listProfiles(): Promise<Profile[]> {
  const rows = await apiJson<UserRow[]>('/api/admin/users');
  return rows;
}

export async function listRoles(): Promise<Role[]> {
  return apiJson<Role[]>('/api/admin/roles');
}

export async function listPages(): Promise<Page[]> {
  return apiJson<Page[]>('/api/admin/pages');
}

export async function listUserRoles(): Promise<{ user_id: string; role_id: string }[]> {
  // Derived from the users list (each row carries its role_ids).
  const rows = await apiJson<UserRow[]>('/api/admin/users');
  return rows.flatMap((u) => u.role_ids.map((role_id) => ({ user_id: u.id, role_id })));
}

export async function listRolePages(): Promise<{ role_id: string; page_id: string }[]> {
  return apiJson<{ role_id: string; page_id: string }[]>('/api/admin/role-pages');
}

export async function listOverrides(): Promise<{ user_id: string; page_id: string; access: 'allow' | 'deny' }[]> {
  return apiJson<{ user_id: string; page_id: string; access: 'allow' | 'deny' }[]>('/api/admin/overrides');
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name?: string;
  role_ids?: string[];
  is_super_admin?: boolean;
}

export async function createUser(payload: CreateUserPayload): Promise<{ user_id: string }> {
  return apiJson<{ user_id: string }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  password?: string;
}

export async function updateUser(userId: string, patch: UpdateUserPayload): Promise<void> {
  await apiJson(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await apiJson(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function setUserRoles(userId: string, roleIds: string[]): Promise<void> {
  await apiJson(`/api/admin/users/${userId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ role_ids: roleIds }),
  });
}

export async function setUserOverride(
  userId: string,
  pageId: string,
  access: 'allow' | 'deny' | null,
): Promise<void> {
  await apiJson(`/api/admin/users/${userId}/overrides`, {
    method: 'PUT',
    body: JSON.stringify({ overrides: [{ page_id: pageId, access }] }),
  });
}

export async function createRole(name: string, description: string): Promise<void> {
  await apiJson('/api/admin/roles', {
    method: 'POST',
    body: JSON.stringify({ name, description: description || null }),
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiJson(`/api/admin/roles/${roleId}`, { method: 'DELETE' });
}

export async function setRolePages(roleId: string, pageIds: string[]): Promise<void> {
  await apiJson(`/api/admin/roles/${roleId}/pages`, {
    method: 'PUT',
    body: JSON.stringify({ page_ids: pageIds }),
  });
}

export async function updatePage(
  pageId: string,
  patch: Partial<Pick<Page, 'is_public' | 'label' | 'sort_order'>>,
): Promise<void> {
  await apiJson(`/api/admin/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
