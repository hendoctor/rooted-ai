// Optimized AuthGuard with instant routing and zero flicker
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthReliable';
import { AuthGuard } from '@/utils/authGuard';

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
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // Don't check while auth is still loading
    if (loading) return;

    const authState = { user, session, loading };
    const searchParams = new URLSearchParams(location.search);
    
    // Check for auth-based redirects (login/logout flows)
    const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);
    
    if (redirectUrl) {
      console.log('🔄 AuthGuard redirecting:', location.pathname, '→', redirectUrl);
      navigate(redirectUrl, { replace: true });
      return;
    }

    // For authenticated users, check permissions instantly (no async calls)
    if (user && requiredRoles.length > 0) {
      const hasRoleAccess = requireRole(requiredRoles, companyId);
      
      if (!hasRoleAccess) {
        console.log('🚫 Access denied for:', location.pathname);
        navigate('/access-denied', { replace: true });
        return;
      }
    }

    setResolved(true);
  }, [user, session, loading, location.pathname, location.search, navigate, requireRole, requiredRoles, companyId]);

  // Show minimal loading only when auth is initializing
  if (loading || !resolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuardRoute;