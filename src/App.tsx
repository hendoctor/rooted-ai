
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuthReliable";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SessionSecurity from "@/components/SessionSecurity";
import FastAuthGuard from "@/components/FastAuthGuard";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ClientPortal from "./pages/ClientPortal";
import CompanyPage from "./pages/CompanyPage";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import RBACDemo from "./pages/RBACDemo";
import RBACGuard from "@/components/RBACGuard";

// Loading wrapper component
const AppLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { loading, error, refreshAuth, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-center text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button onClick={refreshAuth}>Retry</Button>
          <Button variant="outline" onClick={signOut}>Re-login</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Routes>
      {/* Public routes with fast auth guard */}
      <Route 
        path="/" 
        element={
          <FastAuthGuard>
            <Index />
          </FastAuthGuard>
        } 
      />
      <Route 
        path="/auth" 
        element={
          <FastAuthGuard>
            <Auth />
          </FastAuthGuard>
        } 
      />
      
      {/* Protected routes with role requirements */}
      <Route
        path="/admin"
        element={
          <FastAuthGuard requiredRoles={["Admin"]}>
            <AdminDashboard />
          </FastAuthGuard>
        }
      />
      <Route
        path="/profile"
        element={
          <FastAuthGuard requiredRoles={["Admin", "Client"]}>
            <Profile />
          </FastAuthGuard>
        }
      />
      <Route
        path="/rbac-demo"
        element={
          <FastAuthGuard requiredRoles={["Admin", "Client"]}>
            <RBACGuard page="rbac-demo">
              <RBACDemo />
            </RBACGuard>
          </FastAuthGuard>
        }
      />
      <Route
        path="/:slug/settings"
        element={
          <FastAuthGuard requiredRoles={["Admin", "Client"]}>
            <CompanyPage />
          </FastAuthGuard>
        }
      />
      <Route
        path="/:slug"
        element={
          <FastAuthGuard requiredRoles={["Client", "Admin"]}>
            <ClientPortal />
          </FastAuthGuard>
        }
      />
      
      {/* Error routes */}
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SessionSecurity />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppLoadingWrapper>
                <AppContent />
              </AppLoadingWrapper>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
