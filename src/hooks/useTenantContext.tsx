import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cacheManager';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  userRole: string;
  permissions: string[];
}

interface TenantContextType {
  currentTenant: TenantInfo | null;
  availableTenants: TenantInfo[];
  switchTenant: (tenantId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isTenantAdmin: () => boolean;
  isLoading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, userRole, companies } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert companies to tenant format
  const convertCompaniesToTenants = useCallback((companies: any[]): TenantInfo[] => {
    return companies.map(company => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      settings: company.settings || {},
      userRole: company.userRole || 'Member',
      permissions: generatePermissions(company.userRole || 'Member', userRole)
    }));
  }, [userRole]);

  // Generate permissions based on roles
  const generatePermissions = useCallback((tenantRole: string, globalRole?: string): string[] => {
    const permissions: string[] = [];
    
    // Global admin permissions
    if (globalRole === 'Admin') {
      permissions.push(
        'tenant.admin',
        'tenant.manage_users',
        'tenant.manage_content',
        'tenant.view_analytics',
        'tenant.manage_settings'
      );
    }
    
    // Tenant-specific permissions
    switch (tenantRole) {
      case 'Admin':
        permissions.push(
          'tenant.manage_content',
          'tenant.view_analytics',
          'tenant.manage_settings'
        );
        break;
      case 'Manager':
        permissions.push(
          'tenant.view_analytics',
          'tenant.manage_content'
        );
        break;
      case 'Member':
      default:
        permissions.push(
          'tenant.view_content'
        );
        break;
    }
    
    return [...new Set(permissions)]; // Remove duplicates
  }, []);

  // Load tenant data
  const loadTenants = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = `tenant_context_${user.id}`;
      const cached = CacheManager.get<TenantInfo[]>(cacheKey);
      
      if (cached) {
        setAvailableTenants(cached);
        if (!currentTenant && cached.length > 0) {
          setCurrentTenant(cached[0]);
        }
        return;
      }

      // Use existing companies data if available
      if (companies.length > 0) {
        const tenants = convertCompaniesToTenants(companies);
        setAvailableTenants(tenants);
        
        // Cache the tenant data
        CacheManager.set(cacheKey, tenants, 900000); // 15 minutes
        
        // Set current tenant if not set
        if (!currentTenant && tenants.length > 0) {
          setCurrentTenant(tenants[0]);
        }
        return;
      }

      // Fallback: fetch directly from database
      const { data, error } = await supabase.rpc('get_user_companies');
      
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        const tenants = data.map((company: any) => ({
          id: company.company_id,
          name: company.company_name,
          slug: company.company_slug,
          settings: {},
          userRole: company.user_role,
          permissions: generatePermissions(company.user_role, userRole)
        }));
        
        setAvailableTenants(tenants);
        CacheManager.set(cacheKey, tenants, 900000); // 15 minutes
        
        if (!currentTenant && tenants.length > 0) {
          setCurrentTenant(tenants[0]);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load tenant data';
      setError(error);
      console.error('Tenant loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, companies, convertCompaniesToTenants, currentTenant, generatePermissions, userRole]);

  // Switch to different tenant
  const switchTenant = useCallback(async (tenantId: string) => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Validate tenant access
      const hasAccess = await validateTenantAccess(tenantId);
      if (!hasAccess) {
        throw new Error('Access denied to this tenant');
      }
      
      // Clear tenant-specific caches
      CacheManager.invalidate(`company_data_${currentTenant?.id}`);
      CacheManager.invalidate(`company_portal_${currentTenant?.id}`);
      
      setCurrentTenant(tenant);
      
      // Update session storage for faster subsequent loads
      sessionStorage.setItem('current_tenant_id', tenantId);
      
      console.log('Switched to tenant:', tenant.name);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to switch tenant';
      setError(error);
      console.error('Tenant switch error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [availableTenants, currentTenant?.id]);

  // Validate tenant access
  const validateTenantAccess = useCallback(async (tenantId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase.rpc('user_is_company_member', {
        check_company_id: tenantId
      });
      
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Tenant access validation failed:', error);
      return false;
    }
  }, [user?.id]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentTenant) return false;
    return currentTenant.permissions.includes(permission);
  }, [currentTenant]);

  // Check if user is tenant admin
  const isTenantAdmin = useCallback((): boolean => {
    return hasPermission('tenant.admin') || userRole === 'Admin';
  }, [hasPermission, userRole]);

  // Refresh tenant data
  const refreshTenants = useCallback(async () => {
    if (user?.id) {
      CacheManager.invalidate(`tenant_context_${user.id}`);
      await loadTenants();
    }
  }, [user?.id, loadTenants]);

  // Load tenants when auth changes
  useEffect(() => {
    if (user?.id) {
      loadTenants();
    } else {
      setCurrentTenant(null);
      setAvailableTenants([]);
    }
  }, [user?.id, loadTenants]);

  // Restore current tenant from session storage
  useEffect(() => {
    const savedTenantId = sessionStorage.getItem('current_tenant_id');
    if (savedTenantId && availableTenants.length > 0 && !currentTenant) {
      const savedTenant = availableTenants.find(t => t.id === savedTenantId);
      if (savedTenant) {
        setCurrentTenant(savedTenant);
      }
    }
  }, [availableTenants, currentTenant]);

  // Security: Clear tenant context on user change
  useEffect(() => {
    if (!user) {
      setCurrentTenant(null);
      setAvailableTenants([]);
      sessionStorage.removeItem('current_tenant_id');
    }
  }, [user]);

  const value: TenantContextType = {
    currentTenant,
    availableTenants,
    switchTenant,
    hasPermission,
    isTenantAdmin,
    isLoading,
    error,
    refreshTenants
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// Hook to use tenant context
export const useTenantContext = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};

// HOC for tenant-protected components
export const withTenantGuard = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[] = []
) => {
  const TenantGuardedComponent = (props: P) => {
    const { hasPermission, currentTenant, isLoading } = useTenantContext();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    
    if (!currentTenant) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No tenant selected</p>
        </div>
      );
    }
    
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasRequiredPermissions) {
      return (
        <div className="text-center p-8">
          <p className="text-destructive">Access denied: Insufficient permissions</p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
  
  TenantGuardedComponent.displayName = `withTenantGuard(${Component.displayName || Component.name})`;
  return TenantGuardedComponent;
};