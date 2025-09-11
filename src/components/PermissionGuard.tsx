// Dedicated permission guard for role-based access control
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { canAccessPage, hasRoleForCompany } = usePermissions();

  // Check page access
  if (page && !canAccessPage(page)) {
    console.log(`🚫 Access denied to page "${page}" for role "${usePermissions().userRole}"`);
    return fallback || <Navigate to="/access-denied" replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasRoleForCompany(requiredRoles, companyId)) {
    console.log(`🚫 Access denied - required roles: ${requiredRoles.join(', ')}, user role: "${usePermissions().userRole}"`);
    return fallback || <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;