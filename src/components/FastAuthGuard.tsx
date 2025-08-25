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

  const { user, session, loading, requireRole, error } = auth || {};

  useEffect(() => {
    console.log('🛡️ FastAuthGuard check:', { 
      loading, 
      hasAuth: !!auth, 
      hasUser: !!user, 
      path: location.pathname,
      requiredRoles 
    });

    if (loading || !auth) return;

    const authState = { user, session, loading };
    const searchParams = new URLSearchParams(location.search);
    
    // Check for redirects
    const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);
    
    if (redirectUrl) {
      console.log('↪️ FastAuthGuard redirecting:', location.pathname, '→', redirectUrl);
      navigate(redirectUrl, { replace: true });
      return;
    }

    // Check role permissions
    if (user && requiredRoles.length > 0) {
      const hasAccess = requireRole?.(requiredRoles, companyId);
      
      if (!hasAccess) {
        console.log('🚫 FastAuthGuard: Access denied for roles:', requiredRoles);
        navigate('/access-denied', { replace: true });
        return;
      }
    }

    console.log('✅ FastAuthGuard: Access granted');
  }, [auth, user, session, loading, location.pathname, location.search, navigate, requireRole, requiredRoles, companyId]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive text-lg font-medium">
            {error}
          </div>
          <p className="text-muted-foreground">
            Authentication error occurred
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Simple loading state without white screen
  if (!auth || loading) {
    return null; // Let the parent handle loading UI
  }

  return <>{children}</>;
};

export default FastAuthGuard;