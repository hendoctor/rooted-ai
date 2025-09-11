// Simplified permission management hook - wraps RBAC logic
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role, canUser, canCRUD, accessiblePages } from '@/lib/rbac';

export const usePermissions = () => {
  const { userRole, user, companies } = useAuth();

  // Check if user can access a page
  const canAccessPage = useCallback((page: string): boolean => {
    if (!userRole) return false;
    // Map Client role to User for RBAC system, but preserve Admin
    const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;
    return canUser(role, page);
  }, [userRole]);

  // Check if user can perform CRUD operation on resource
  const canPerformAction = useCallback((resource: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
    if (!userRole) return false;
    // Map Client role to User for RBAC system, but preserve Admin
    const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;
    return canCRUD(role, resource, action);
  }, [userRole]);

  // Check if user has required roles for a company
  const hasRoleForCompany = useCallback((roles: string[], companyId?: string): boolean => {
    if (!userRole || !user) return false;

    // Admin always has access
    if (userRole === 'Admin') return true;

    // Check global role
    if (roles.includes(userRole)) {
      // If company-specific check needed, verify access
      if (companyId) {
        return companies.some(c => c.id === companyId && roles.includes(c.userRole));
      }
      return true;
    }

    return false;
  }, [userRole, user, companies]);

  // Get accessible routes
  const getAccessibleRoutes = useCallback((): string[] => {
    const routes: string[] = ['/'];
    if (!user) return routes;

    routes.push('/profile');
    if (userRole === 'Admin') routes.push('/admin');
    companies.forEach(company => routes.push(`/${company.slug}`));

    return routes;
  }, [user, userRole, companies]);

  // Get pages user can access based on RBAC
  const accessiblePagesList = useMemo(() => {
    if (!userRole) return [];
    const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;
    return accessiblePages(role);
  }, [userRole]);

  // Get user capabilities for UI rendering
  const capabilities = useMemo(() => {
    if (!userRole) return {
      canManageUsers: false,
      canViewReports: false,
      canManageCompanies: false,
      canAccessAdmin: false,
      isAdmin: false,
      isClient: false
    };

    // Map Client role to User for RBAC system
    const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;

    return {
      canManageUsers: canCRUD(role, 'users', 'create') || canCRUD(role, 'users', 'update'),
      canViewReports: canCRUD(role, 'reports', 'read'),
      canManageCompanies: canCRUD(role, 'companies', 'create') || canCRUD(role, 'companies', 'update'),
      canAccessAdmin: canUser(role, 'dashboard'),
      isAdmin: userRole === 'Admin',
      isClient: userRole === 'Client'
    };
  }, [userRole]);

  return {
    canAccessPage,
    canPerformAction,
    hasRoleForCompany,
    getAccessibleRoutes,
    accessiblePages: accessiblePagesList,
    capabilities,
    userRole,
    companies
  };
};