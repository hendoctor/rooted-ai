// Simplified RBAC hook - legacy support only, use usePermissions instead
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role, canUser, canCRUD } from '@/lib/rbac';

export const useRBAC = () => {
  const { userRole } = useAuth();

  // Simple permission checker without caching
  const hasPermission = useCallback((resource: string, action?: string): boolean => {
    if (!userRole) return false;
    
    const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;

    if (action) {
      // Check CRUD permission
      return canCRUD(role, resource, action as any);
    } else {
      // Check page/resource access
      return canUser(role, resource);
    }
  }, [userRole]);

  // Simple capabilities for UI rendering
  const capabilities = useMemo(() => {
    if (!userRole) return {
      canManageUsers: false,
      canViewReports: false,
      canManageCompanies: false,
      isAdmin: false
    };

    return {
      canManageUsers: hasPermission('users', 'create') || hasPermission('users', 'update'),
      canViewReports: hasPermission('reports', 'read'),
      canManageCompanies: hasPermission('companies', 'create') || hasPermission('companies', 'update'),
      isAdmin: userRole === 'Admin'
    };
  }, [userRole, hasPermission]);

  return {
    hasPermission,
    capabilities
  };
};