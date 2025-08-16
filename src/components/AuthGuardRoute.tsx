// Server-side style auth guard for client-side routing
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthReliable';
import { AuthGuard } from '@/utils/authGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AuthGuardRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  companyId?: string;
}

const AuthGuardRoute: React.FC<AuthGuardRouteProps> = ({ 
  children, 
  requiredRoles = [],
  companyId 
}) => {
  const { user, session, loading, requireRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    const authState = { user, session, loading };
    const searchParams = new URLSearchParams(location.search);
    
    // Get redirect URL if needed
    const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);
    
    if (redirectUrl) {
      console.log('🔄 AuthGuard redirecting:', location.pathname, '→', redirectUrl);
      navigate(redirectUrl, { replace: true });
      return;
    }

    // Check role requirements for protected routes
    if (user && requiredRoles.length > 0) {
      const hasAccess = requireRole(requiredRoles, companyId);
      
      if (!hasAccess) {
        console.log('🚫 Access denied for roles:', requiredRoles);
        navigate('/access-denied', { replace: true });
        return;
      }
    }

    setChecking(false);
  }, [user, session, loading, location.pathname, location.search, navigate, requireRole, requiredRoles, companyId]);

  // Show loading while checking auth
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-slate-900">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuardRoute;