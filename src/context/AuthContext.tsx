import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as authApi from '@/lib/authApi';
import type { AuthUser } from '@/lib/authApi';
import type { Profile } from '@/types/access';

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
  /** Paths the current user may access (from /api/auth/me). */
  accessiblePaths: Set<string>;
  /** Paths flagged public (readable without auth). */
  publicPaths: Set<string>;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessiblePaths, setAccessiblePaths] = useState<Set<string>>(new Set());
  const [publicPaths, setPublicPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.is_super_admin === true;
  const profile: Profile | null = user
    ? { id: user.user_id, email: user.email ?? '', full_name: user.full_name ?? null, is_active: true, created_at: '' }
    : null;

  const applyUser = useCallback((me: AuthUser | null) => {
    setUser(me);
    setAccessiblePaths(new Set(me?.accessible_paths ?? []));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [paths, me] = await Promise.all([authApi.fetchPublicPaths(), authApi.fetchMe()]);
      if (!active) return;
      setPublicPaths(new Set(paths));
      applyUser(me);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [applyUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await authApi.login(email, password);
        const me = await authApi.fetchMe();
        applyUser(me);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Sign in failed' };
      }
    },
    [applyUser],
  );

  const signOut = useCallback(async () => {
    await authApi.logout();
    applyUser(null);
  }, [applyUser]);

  const refreshAccess = useCallback(async () => {
    const me = await authApi.fetchMe();
    applyUser(me);
  }, [applyUser]);

  return (
    <AuthContext.Provider
      value={{ user, profile, isSuperAdmin, accessiblePaths, publicPaths, loading, signIn, signOut, refreshAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
