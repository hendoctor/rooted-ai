
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminCenter from "./pages/AdminCenter";
import UserManagement from "./pages/UserManagement";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import VapidSetup from "./pages/VapidSetup";
import PrivateRoute from "./components/PrivateRoute";

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute requiredRoles={["Admin"]}>
            <Admin />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin-center"
        element={
          <PrivateRoute requiredRoles={["Admin"]}>
            <AdminCenter />
          </PrivateRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <PrivateRoute requiredRoles={["Admin"]}>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/vapid-setup"
        element={
          <PrivateRoute requiredRoles={["Admin", "Client"]}>
            <VapidSetup />
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
  );
};

export default App;
