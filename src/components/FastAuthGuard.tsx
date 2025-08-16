// Ultra-fast AuthGuard without permission checking delays
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthReliable';
import { AuthGuard } from '@/utils/authGuard';

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
  const [shouldRender, setShouldRender] = useState(false);

  // Destructure with safety checks
  const { user, session, loading, requireRole } = auth || {};

  useEffect(() => {
    if (loading || !auth) return;

    const authState = { user, session, loading };
    const searchParams = new URLSearchParams(location.search);
    
    // Fast redirect check
    const redirectUrl = AuthGuard.getRedirectUrl(authState, location.pathname, searchParams);
    
    if (redirectUrl) {
      navigate(redirectUrl, { replace: true });
      return;
    }

    // Instant role check using cached permissions
    if (user && requiredRoles.length > 0) {
      const hasAccess = requireRole?.(requiredRoles, companyId);
      
      if (!hasAccess) {
        navigate('/access-denied', { replace: true });
        return;
      }
    }

    setShouldRender(true);
  }, [auth, user, session, loading, location.pathname, location.search, navigate, requireRole, requiredRoles, companyId]);

  // Zero-flicker loading state with error boundary
  if (!auth || loading || !shouldRender) {
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