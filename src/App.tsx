
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuthSecure";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Removed useRolePersistence - now handled in useAuthSecure

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ClientPortal from "./pages/ClientPortal";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/PrivateRoute";

const AppContent = () => {
  // Role persistence now handled in useAuthSecure
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute requiredRoles={["Admin"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute requiredRoles={["Admin", "Client"]}>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/:clientSlug"
        element={
          <PrivateRoute requiredRoles={["Admin", "Client"]}>
            <ClientPortal />
          </PrivateRoute>
        }
      />
      <Route path="/access-denied" element={<AccessDenied />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
