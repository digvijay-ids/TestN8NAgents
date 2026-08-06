import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import UsptoPage from "./pages/UsptoPage";
import ContinuityPage from "./pages/ContinuityPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import UsersAdminPage from "./pages/admin/UsersAdminPage";
import RolesAdminPage from "./pages/admin/RolesAdminPage";
import PagesAdminPage from "./pages/admin/PagesAdminPage";
import { AppStateProvider } from "./context/AppStateContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppStateProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              {/* Public routes — combined landing + login */}
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Private routes (guarded) */}
              <Route element={<Layout />}>
                <Route
                  path="/create-documents"
                  element={<ProtectedRoute><Index /></ProtectedRoute>}
                />
                <Route
                  path="/uspto-documents"
                  element={<ProtectedRoute><UsptoPage /></ProtectedRoute>}
                />
                <Route
                  path="/continuity"
                  element={<ProtectedRoute><ContinuityPage /></ProtectedRoute>}
                />

                {/* Admin routes (super-admin only) */}
                <Route
                  path="/admin/users"
                  element={<ProtectedRoute requireSuperAdmin><UsersAdminPage /></ProtectedRoute>}
                />
                <Route
                  path="/admin/roles"
                  element={<ProtectedRoute requireSuperAdmin><RolesAdminPage /></ProtectedRoute>}
                />
                <Route
                  path="/admin/pages"
                  element={<ProtectedRoute requireSuperAdmin><PagesAdminPage /></ProtectedRoute>}
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppStateProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
