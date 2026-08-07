import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NoAccess from '@/pages/NoAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Require super-admin regardless of page grants (e.g. /admin/*). */
  requireSuperAdmin?: boolean;
  /** Open to any signed-in user regardless of page grants (e.g. /account). */
  authenticatedOnly?: boolean;
}

/**
 * Gate for private routes. Decision order:
 *  - loading            → spinner
 *  - page is public     → render
 *  - not authenticated  → redirect to /login
 *  - authenticatedOnly  → render (any signed-in user, no page grant needed)
 *  - super-admin        → render (bypasses page grants)
 *  - requireSuperAdmin  → NoAccess if not super-admin
 *  - path granted       → render
 *  - otherwise          → NoAccess (403)
 */
export function ProtectedRoute({
  children,
  requireSuperAdmin = false,
  authenticatedOnly = false,
}: ProtectedRouteProps) {
  const { user, isSuperAdmin, accessiblePaths, publicPaths, loading } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (publicPaths.has(path) && !requireSuperAdmin) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  if (authenticatedOnly && !requireSuperAdmin) {
    return <>{children}</>;
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (requireSuperAdmin) {
    return <NoAccess />;
  }

  if (accessiblePaths.has(path)) {
    return <>{children}</>;
  }

  return <NoAccess />;
}
