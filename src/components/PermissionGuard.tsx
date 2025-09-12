// Dedicated permission guard for role-based access control
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { LoadingIcon } from '@/components/LoadingSpinner';

interface PermissionGuardProps {
  page?: string;
  requiredRoles?: string[];
  companyId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  page,
  requiredRoles = [],
  companyId,
  fallback,
  children 
}) => {
  const { authReady, loading } = useAuth();
  const { canAccessPage, hasRoleForCompany, userRole } = usePermissions();

  // Wait for auth to be fully ready and not loading
  if (!authReady || loading || userRole === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingIcon size="lg" />
          <div className="text-sm text-muted-foreground">Loading permissions...</div>
        </div>
      </div>
    );
  }

  // Check page access
  if (page && !canAccessPage(page)) {
    console.log(`🚫 Access denied to page "${page}" for role "${userRole}"`);
    return fallback || <Navigate to="/access-denied" replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasRoleForCompany(requiredRoles, companyId)) {
    console.log(`🚫 Access denied - required roles: ${requiredRoles.join(', ')}, user role: "${userRole}"`);
    return fallback || <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;