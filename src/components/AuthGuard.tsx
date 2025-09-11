// Simplified auth guard - only handles authentication
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback
}) => {
  const { user, loading, error, clearError } = useAuth();
  const location = useLocation();
  const [showRefreshOption, setShowRefreshOption] = React.useState(false);

  // Show refresh option after 8 seconds of loading
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowRefreshOption(true), 8000);
      return () => clearTimeout(timer);
    } else {
      setShowRefreshOption(false);
    }
  }, [loading]);

  // Show loading state with recovery option
  if (loading) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Loading your session...</p>
          {showRefreshOption && (
            <div className="mt-8 space-y-2">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="text-sm"
              >
                Refresh Page
              </Button>
              <p className="text-xs text-muted-foreground">
                If this continues, try refreshing the page
              </p>
            </div>
          )}
        </div>
      </div>
    );
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

  return <>{children}</>;
};

export default AuthGuard;