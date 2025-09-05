// Simplified auth guard with proper loading states
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  companyId?: string;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRoles = [],
  companyId,
  fallback
}) => {
  const { user, loading, error, requireRole, clearError } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  // Show error state with recovery
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="text-destructive text-lg font-medium">
            {error}
          </div>
          <p className="text-muted-foreground text-sm">
            Something went wrong with authentication. Please try refreshing the page.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!user) {
    // Redirect to auth page with return URL
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(returnUrl)}`} replace />;
  }

  // Check authorization
  if (requiredRoles.length > 0) {
    const hasAccess = requireRole(requiredRoles, companyId);
    if (!hasAccess) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <>{children}</>;
};

export default AuthGuard;