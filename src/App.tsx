
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useVisibilityRefresh } from "@/hooks/useVisibilityRefresh";
import { useProgressiveLoading } from "@/hooks/useProgressiveLoading";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import AuthGuard from "@/components/AuthGuard";
import PermissionGuard from "@/components/PermissionGuard";
import RBACGuard from "@/components/RBACGuard";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ClientPortal from "./pages/ClientPortal";
import CompanyPage from "./pages/CompanyPage";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import RBACDemo from "./pages/RBACDemo";

// Enhanced loading wrapper with mobile optimizations
const AppLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { loading, authReady, error, refreshAuth, clearError, user, userRole } = useAuth();
  const performance = usePerformanceMonitor();
  
  // Progressive loading states
  const loadingState = useProgressiveLoading(loading, !!user, !!userRole);
  
  // Enable mobile-specific auth refresh on visibility changes
  useVisibilityRefresh();

  // Track performance
  React.useEffect(() => {
    if (loading) {
      performance.trackTotalLoad();
    } else {
      performance.trackTotalComplete();
    }
  }, [loading, performance]);

  // Show error with enhanced recovery options
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <div className="text-xs text-muted-foreground/70 mt-2">
            Try refreshing or check your connection
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={refreshAuth} size="sm">Retry</Button>
          <Button variant="outline" onClick={clearError} size="sm">Continue</Button>
          <Button variant="ghost" onClick={() => window.location.reload()} size="sm">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Show progressive loading with enhanced messages - only when not auth ready
  if (loading || !authReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-muted-foreground">{loadingState.message}</div>
          
          {/* Progress bar */}
          <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
          
          {/* Stage indicator */}
          <div className="text-xs text-muted-foreground/70">
            {loadingState.stage === 'checking' && '🔍'}
            {loadingState.stage === 'authenticating' && '🔐'}
            {loadingState.stage === 'loading-profile' && '👤'}
            {loadingState.stage === 'almost-ready' && '✨'}
          </div>
        </div>
        
        {/* Fallback after extended loading */}
        {loadingState.progress > 50 && (
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Taking too long? Refresh page
            </Button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

// Global admin redirect hook
const useAdminRedirect = () => {
  const { user, authReady, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  React.useEffect(() => {
    if (authReady && user && userRole === 'Admin' && location.pathname !== '/admin') {
      console.log('🔄 Global admin redirect from', location.pathname, 'to /admin');
      navigate('/admin', { replace: true });
    }
  }, [user, authReady, userRole, navigate, location.pathname]);
};

const AppContent = () => {
  useAdminRedirect();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes with role requirements */}
      <Route
        path="/admin"
        element={
          <AuthGuard>
            <PermissionGuard requiredRoles={["Admin"]}>
              <AdminDashboard />
            </PermissionGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/profile"
        element={
          <AuthGuard>
            <PermissionGuard requiredRoles={["Admin", "Client"]}>
              <Profile />
            </PermissionGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/rbac-demo"
        element={
          <AuthGuard>
            <PermissionGuard requiredRoles={["Admin", "Client"]}>
              <RBACGuard page="rbac-demo">
                <RBACDemo />
              </RBACGuard>
            </PermissionGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/:slug/settings"
        element={
          <AuthGuard>
            <PermissionGuard requiredRoles={["Admin", "Client"]}>
              <CompanyPage />
            </PermissionGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/:slug"
        element={
          <AuthGuard>
            <PermissionGuard requiredRoles={["Client", "Admin"]}>
              <ClientPortal />
            </PermissionGuard>
          </AuthGuard>
        }
      />
      
      {/* Error routes */}
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      gcTime: 900000, // 15 minutes (was cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => {
  console.log('App component rendering...');

  return (
    <div>
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              {/* <SessionSecurity /> */}
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppLoadingWrapper>
                  <main id="main-content">
                    <AppContent />
                  </main>
                </AppLoadingWrapper>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  );
};

export default App;
