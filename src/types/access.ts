/**
 * Access-management domain types, mirroring the Supabase `public` schema.
 */

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Page {
  id: string;
  path: string;
  label: string;
  is_public: boolean;
  sort_order: number;
  created_at: string;
}

export type PageAccess = 'allow' | 'deny';

export interface UserPageOverride {
  user_id: string;
  page_id: string;
  access: PageAccess;
}

/** A profile enriched with its assigned role ids (for admin UI). */
export interface AdminUser extends Profile {
  role_ids: string[];
  is_super_admin: boolean;
}
