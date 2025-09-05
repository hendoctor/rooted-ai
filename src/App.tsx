
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SessionSecurity from "@/components/SessionSecurity";
import AuthGuard from "@/components/AuthGuard";
import { CacheManager } from "@/lib/cacheManager";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

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

  // Show loading spinner only for initial auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show error with recovery options
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAuth}>Retry</Button>
          <Button variant="outline" onClick={signOut}>Re-login</Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes with role requirements */}
      <Route
        path="/admin"
        element={
          <AuthGuard requiredRoles={["Admin"]}>
            <AdminDashboard />
          </AuthGuard>
        }
      />
      <Route
        path="/profile"
        element={
          <AuthGuard requiredRoles={["Admin", "Client"]}>
            <Profile />
          </AuthGuard>
        }
      />
      <Route
        path="/rbac-demo"
        element={
          <AuthGuard requiredRoles={["Admin", "Client"]}>
            <RBACGuard page="rbac-demo">
              <RBACDemo />
            </RBACGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/:slug/settings"
        element={
          <AuthGuard requiredRoles={["Admin", "Client"]}>
            <CompanyPage />
          </AuthGuard>
        }
      />
      <Route
        path="/:slug"
        element={
          <AuthGuard requiredRoles={["Client", "Admin"]}>
            <ClientPortal />
          </AuthGuard>
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
  // Initialize cache management
  React.useEffect(() => {
    // Set app version for cache validation
    CacheManager.setVersion('1.0.0');
    
    // Clear caches on page refresh if needed
    if (performance.navigation?.type === 1) { // Page refresh
      console.log('Page refresh detected, validating caches');
      CacheManager.cleanup();
    }
  }, []);

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
