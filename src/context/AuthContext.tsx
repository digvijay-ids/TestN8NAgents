import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Page, Profile } from '@/types/access';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
  /** Paths the current user may access (from public.my_pages()). */
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessiblePaths, setAccessiblePaths] = useState<Set<string>>(new Set());
  const [publicPaths, setPublicPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;
  const isSuperAdmin = user?.app_metadata?.is_super_admin === true;

  const loadAccess = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setProfile(null);
      setAccessiblePaths(new Set());
      return;
    }
    // Profile + accessible pages in parallel.
    const [{ data: profileData }, { data: pagesData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle(),
      supabase.rpc('my_pages'),
    ]);
    setProfile((profileData as Profile) ?? null);
    const paths = new Set<string>(((pagesData as Page[]) ?? []).map((p) => p.path));
    setAccessiblePaths(paths);
  }, []);

  useEffect(() => {
    let active = true;

    // Public pages are readable without auth (anon RLS policy); load once.
    supabase
      .from('pages')
      .select('path')
      .eq('is_public', true)
      .then(({ data }) => {
        if (active && data) setPublicPaths(new Set(data.map((p) => p.path as string)));
      });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadAccess(data.session?.user ?? null);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      await loadAccess(newSession?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAccess]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccessiblePaths(new Set());
    setProfile(null);
  }, []);

  const refreshAccess = useCallback(async () => {
    await loadAccess(user);
  }, [loadAccess, user]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isSuperAdmin, accessiblePaths, publicPaths, loading, signIn, signOut, refreshAccess }}
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
