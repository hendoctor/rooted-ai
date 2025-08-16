import React, { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthSecure';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRoles: string[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { user, userRole, loading: authLoading } = useAuth();
  const { hasPageAccessSync, hasPageAccess } = useRolePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const currentPath = window.location.pathname;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      // Set a maximum timeout for permission checking
      timeoutRef.current = setTimeout(() => {
        console.warn('⏰ Permission check timeout - using fallback');
        const roleAccess = userRole ? requiredRoles.includes(userRole) : false;
        setHasAccess(roleAccess);
        setChecking(false);
      }, 8000); // 8 second max timeout

      try {
        if (!userRole || !user) {
          setHasAccess(false);
          setChecking(false);
          return;
        }

        // First try synchronous cache check
        const cachedAccess = hasPageAccessSync(currentPath);
        if (cachedAccess !== null) {
          console.log('🎯 Using cached access for', currentPath, ':', cachedAccess);
          const roleAccess = requiredRoles.includes(userRole);
          setHasAccess(cachedAccess || roleAccess);
          setChecking(false);
          return;
        }

        // If no cache, do async check with timeout
        try {
          const pageAccess = await Promise.race([
            hasPageAccess(currentPath),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          
          const roleAccess = requiredRoles.includes(userRole);
          setHasAccess(pageAccess || roleAccess);
        } catch (error) {
          console.warn('Permission check failed, using role fallback:', error);
          const roleAccess = requiredRoles.includes(userRole);
          setHasAccess(roleAccess);
        }
      } catch (error) {
        console.error('Access check error:', error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, userRole, authLoading, currentPath, requiredRoles, hasPageAccess, hasPageAccessSync]);

  // Show loading only for a limited time
  if ((authLoading || checking) && hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking access..." />
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
