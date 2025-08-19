
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuthReliable";
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
        path="/client-portal"
        element={
          <FastAuthGuard requiredRoles={["Client"]}>
            <ClientPortal />
          </FastAuthGuard>
        }
      />
      <Route
        path="/company/:slug"
        element={
          <FastAuthGuard requiredRoles={["Admin", "Client"]}>
            <CompanyPage />
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
