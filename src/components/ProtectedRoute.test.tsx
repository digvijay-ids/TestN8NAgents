import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Mock the auth context; each test sets the return value.
const mockAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

function renderAt(path: string, requireSuperAdmin = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route
          path={path}
          element={
            <ProtectedRoute requireSuperAdmin={requireSuperAdmin}>
              <div>SECRET CONTENT</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const base = {
  user: null,
  isSuperAdmin: false,
  accessiblePaths: new Set<string>(),
  publicPaths: new Set<string>(),
  loading: false,
};

beforeEach(() => mockAuth.mockReset());

describe('ProtectedRoute', () => {
  it('shows a spinner while loading', () => {
    mockAuth.mockReturnValue({ ...base, loading: true });
    const { container } = renderAt('/continuity');
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('renders public pages without auth', () => {
    mockAuth.mockReturnValue({ ...base, publicPaths: new Set(['/continuity']) });
    renderAt('/continuity');
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    mockAuth.mockReturnValue({ ...base });
    renderAt('/continuity');
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('renders when the path is granted', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'u1' }, accessiblePaths: new Set(['/continuity']) });
    renderAt('/continuity');
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('shows Access denied when authenticated but not granted', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'u1' }, accessiblePaths: new Set(['/other']) });
    renderAt('/continuity');
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('super-admin bypasses page grants', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'admin' }, isSuperAdmin: true });
    renderAt('/continuity');
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('blocks non-super-admins from requireSuperAdmin routes even if path granted', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'u1' }, accessiblePaths: new Set(['/admin/users']) });
    renderAt('/admin/users', true);
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
  });

  it('allows super-admin on requireSuperAdmin routes', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'admin' }, isSuperAdmin: true });
    renderAt('/admin/users', true);
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('authenticatedOnly renders for any signed-in user without a page grant', () => {
    mockAuth.mockReturnValue({ ...base, user: { id: 'u1' }, accessiblePaths: new Set(['/other']) });
    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route
            path="/account"
            element={
              <ProtectedRoute authenticatedOnly>
                <div>SECRET CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('authenticatedOnly still redirects unauthenticated users to /login', () => {
    mockAuth.mockReturnValue({ ...base });
    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route
            path="/account"
            element={
              <ProtectedRoute authenticatedOnly>
                <div>SECRET CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });
});
