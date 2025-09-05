import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role, canUser, canCRUD } from '@/lib/rbac';
import { CacheManager } from '@/lib/cacheManager';

interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

interface RBACState {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
}

export const useRBAC = () => {
  const { userRole, user } = useAuth();
  const [rbacState, setRBACState] = useState<RBACState>({
    permissions: [],
    loading: true,
    error: null
  });

  // Memoized permission checker
  const hasPermission = useCallback((resource: string, action?: string): boolean => {
    if (!userRole) return false;
    
    // Cache key for this permission check
    const cacheKey = `rbac_${userRole}_${resource}_${action || 'access'}`;
    const cached = CacheManager.get<boolean>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    let result = false;

    if (action) {
      // Check CRUD permission
      result = canCRUD(userRole as Role, resource, action as any);
    } else {
      // Check page/resource access
      result = canUser(userRole as Role, resource);
    }

    // Cache the result for 5 minutes
    CacheManager.set(cacheKey, result, 300000);
    return result;
  }, [userRole]);

  // Batch permission checker for better performance
  const hasPermissions = useCallback((checks: Array<{ resource: string; action?: string }>): boolean[] => {
    return checks.map(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  // Check if user can access multiple resources
  const canAccessAny = useCallback((resources: string[]): boolean => {
    return resources.some(resource => hasPermission(resource));
  }, [hasPermission]);

  // Check if user can access all resources
  const canAccessAll = useCallback((resources: string[]): boolean => {
    return resources.every(resource => hasPermission(resource));
  }, [hasPermission]);

  // Get accessible pages for navigation
  const accessiblePages = useMemo(() => {
    if (!userRole) return [];
    
    const pages = ['profile', 'dashboard', 'reports', 'rbac-demo'];
    return pages.filter(page => hasPermission(page));
  }, [userRole, hasPermission]);

  // Get user capabilities for UI rendering
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

  // Load and cache permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (!userRole || !user?.id) {
        setRBACState({
          permissions: [],
          loading: false,
          error: null
        });
        return;
      }

      try {
        setRBACState(prev => ({ ...prev, loading: true, error: null }));

        // Check cache first
        const cacheKey = `rbac_permissions_${user.id}_${userRole}`;
        const cached = CacheManager.get<Permission[]>(cacheKey);

        if (cached) {
          setRBACState({
            permissions: cached,
            loading: false,
            error: null
          });
          return;
        }

        // Generate permissions based on role
        const resources = ['users', 'companies', 'reports', 'dashboard'];
        const actions = ['create', 'read', 'update', 'delete'];
        
        const permissions: Permission[] = [];
        
        for (const resource of resources) {
          for (const action of actions) {
            permissions.push({
              resource,
              action,
              granted: hasPermission(resource, action)
            });
          }
        }

        // Cache permissions for 10 minutes
        CacheManager.set(cacheKey, permissions, 600000);

        setRBACState({
          permissions,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('RBAC loading error:', error);
        setRBACState({
          permissions: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load permissions'
        });
      }
    };

    loadPermissions();
  }, [userRole, user?.id, hasPermission]);

  // Clear permissions cache when user changes
  useEffect(() => {
    if (user?.id) {
      const cacheKey = `rbac_permissions_${user.id}`;
      CacheManager.invalidate(cacheKey);
    }
  }, [user?.id]);

  // Permission debugging (admin only)
  const debugPermissions = useCallback(() => {
    if (userRole !== 'Admin') {
      console.warn('Permission debugging is only available for admin users');
      return;
    }

    console.group('RBAC Debug Information');
    console.log('User Role:', userRole);
    console.log('User ID:', user?.id);
    console.log('Accessible Pages:', accessiblePages);
    console.log('Capabilities:', capabilities);
    console.log('All Permissions:', rbacState.permissions);
    console.groupEnd();
  }, [userRole, user?.id, accessiblePages, capabilities, rbacState.permissions]);

  return {
    hasPermission,
    hasPermissions,
    canAccessAny,
    canAccessAll,
    accessiblePages,
    capabilities,
    permissions: rbacState.permissions,
    loading: rbacState.loading,
    error: rbacState.error,
    debugPermissions
  };
};