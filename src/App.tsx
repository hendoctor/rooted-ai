
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuthOptimized";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SessionSecurity from "@/components/SessionSecurity";
import AuthGuardRoute from "@/components/AuthGuardRouteOptimized";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ClientPortal from "./pages/ClientPortal";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

const AppContent = () => {
  return (
    <Routes>
      {/* Public routes with auth guard */}
      <Route 
        path="/" 
        element={
          <AuthGuardRoute>
            <Index />
          </AuthGuardRoute>
        } 
      />
      <Route 
        path="/auth" 
        element={
          <AuthGuardRoute>
            <Auth />
          </AuthGuardRoute>
        } 
      />
      
      {/* Protected routes with role requirements */}
      <Route
        path="/admin"
        element={
          <AuthGuardRoute requiredRoles={["Admin"]}>
            <AdminDashboard />
          </AuthGuardRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <AuthGuardRoute requiredRoles={["Admin", "Client"]}>
            <Profile />
          </AuthGuardRoute>
        }
      />
      <Route
        path="/:clientSlug"
        element={
          <AuthGuardRoute requiredRoles={["Admin", "Client"]}>
            <ClientPortal />
          </AuthGuardRoute>
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
              <AppContent />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
