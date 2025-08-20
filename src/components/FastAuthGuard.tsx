// Ultra-fast AuthGuard without permission checking delays
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthReliable';
import { AuthGuard } from '@/utils/authGuard';
import { Button } from '@/components/ui/button';

interface FastAuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  companyId?: string;
}

const FastAuthGuard: React.FC<FastAuthGuardProps> = ({ 
  children, 
  requiredRoles = [],
  companyId 
}) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Public routes should render immediately
  const [shouldRender, setShouldRender] = useState(requiredRoles.length === 0);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Destructure with safety checks
  const { user, session, loading, requireRole, error } = auth || {};

  // Timeout protection for infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading && !shouldRender) {
        console.warn('⚠️ FastAuthGuard timeout after 30 seconds');
        setTimeoutReached(true);
      }
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, [loading, shouldRender]);

  // Reset timeout flag once loading completes
  useEffect(() => {
    if (!loading && shouldRender) {
      setTimeoutReached(false);
    }
  }, [loading, shouldRender]);

  useEffect(() => {
    console.log('🛡️ FastAuthGuard check:', { 
      loading, 
      hasAuth: !!auth, 
      hasUser: !!user, 
      path: location.pathname,
      requiredRoles 
    });

    if (!auth) return;

    // For public routes, render immediately and handle redirects when auth is ready
    if (requiredRoles.length === 0) {
      if (!loading) {
        const authState = { user, session, loading };
        const searchParams = new URLSearchParams(location.search);
        const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);
        if (redirectUrl) {
          console.log('↪️ FastAuthGuard redirecting:', location.pathname, '→', redirectUrl);
          navigate(redirectUrl, { replace: true });
          return;
        }
      }
      setShouldRender(true);
      return;
    }

    if (loading) return;

    const authState = { user, session, loading };
    const searchParams = new URLSearchParams(location.search);

    // Fast redirect check
    const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);

    if (redirectUrl) {
      console.log('↪️ FastAuthGuard redirecting:', location.pathname, '→', redirectUrl);
      navigate(redirectUrl, { replace: true });
      return;
    }

    // Instant role check using cached permissions
    if (user && requiredRoles.length > 0) {
      const hasAccess = requireRole?.(requiredRoles, companyId);

      if (!hasAccess) {
        console.log('🚫 FastAuthGuard: Access denied for roles:', requiredRoles);
        navigate('/access-denied', { replace: true });
        return;
      }
    }

    console.log('✅ FastAuthGuard: Access granted');
    setShouldRender(true);
  }, [auth, user, session, loading, location.pathname, location.search, navigate, requireRole, requiredRoles, companyId]);

  // Show timeout error with retry option
  if (timeoutReached || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive text-lg font-medium">
            {error || 'Loading timeout'}
          </div>
          <p className="text-muted-foreground">
            {error ? 'Authentication error occurred' : 'The page is taking too long to load'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Zero-flicker loading state with error boundary
  if (requiredRoles.length > 0 && (!auth || loading || !shouldRender)) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal spinner to prevent layout shift */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FastAuthGuard;