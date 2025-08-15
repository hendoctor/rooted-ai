import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthSecure';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRoles: string[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const currentPath = window.location.pathname;

  useEffect(() => {
    const checkAccess = async () => {
      if (loading || !userRole) return;

      // Check if user has access to this specific page
      const { data } = await supabase
        .from('role_permissions')
        .select('access')
        .eq('role', userRole)
        .eq('page', currentPath)
        .eq('access', true)
        .maybeSingle();

      // Also check by required roles (fallback)
      const roleAccess = requiredRoles.includes(userRole);
      
      setHasAccess(!!data || roleAccess);
    };

    checkAccess();
  }, [user, userRole, loading, currentPath, requiredRoles]);

  if (loading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }
  
  const role = userRole ?? 'Client';
  if (!user || (!hasAccess && !requiredRoles.includes(role))) {
    return <Navigate to="/access-denied" replace />;
  }
  
  return children;
};

export default PrivateRoute;
