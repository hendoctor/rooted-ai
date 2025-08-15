import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthSecureV2';
import { authCache } from './useAuthCache';

interface MenuPermission {
  page: string;
  menu_item: string;
  visible: boolean;
  access: boolean;
}

const PERMISSION_TIMEOUT = 5000; // 5 seconds

export const useRolePermissions = () => {
  const { userRole, user, loading: authLoading } = useAuth();
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch fetch all permissions for better performance
  const fetchAllPermissions = useCallback(async (role: string, userId: string) => {
    if (!role || !userId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedMenu = authCache.getMenuPermissions(userId);
    if (cachedMenu) {
      console.log('🎯 Using cached menu permissions');
      setMenuPermissions(cachedMenu);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching permissions for role:', role);
      
      // Fetch all permissions in one query with timeout
      const permissionsPromise = supabase
        .from('role_permissions')
        .select('page, menu_item, visible, access')
        .eq('role', role);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Permissions fetch timeout')), PERMISSION_TIMEOUT)
      );

      const { data: permissionsData, error: permissionsError } = await Promise.race([
        permissionsPromise,
        timeoutPromise
      ]) as any;

      if (permissionsError) {
        console.warn('Permissions fetch error:', permissionsError);
        setLoading(false);
        return;
      }

      const permissions = permissionsData || [];
      
      // Filter menu permissions
      const menuPerms = permissions.filter((p: any) => p.visible && p.menu_item);
      setMenuPermissions(menuPerms);
      
      // Cache menu permissions
      authCache.setMenuPermissions(userId, menuPerms);
      
      // Cache individual page permissions for faster lookups
      permissions.forEach((perm: any) => {
        if (perm.page) {
          authCache.setPermission(userId, perm.page, perm.access);
        }
      });

      console.log('✅ Permissions fetched and cached');
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setMenuPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized permission check with caching
  const hasPageAccess = useCallback(async (page: string): Promise<boolean> => {
    if (!userRole || !user?.id) return false;

    // Check cache first
    const cached = authCache.getPermission(user.id, page);
    if (cached !== null) {
      console.log('🎯 Using cached permission for', page, ':', cached);
      return cached;
    }

    try {
      console.log('🔍 Checking page access for:', page);
      
      const permissionPromise = supabase
        .from('role_permissions')
        .select('access')
        .eq('role', userRole)
        .eq('page', page)
        .eq('access', true)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Permission check timeout')), 3000)
      );

      const { data: permissionData, error: permissionError } = await Promise.race([
        permissionPromise,
        timeoutPromise
      ]) as any;

      const hasAccess = !permissionError && !!permissionData;
      
      // Cache the result
      authCache.setPermission(user.id, page, hasAccess);
      
      return hasAccess;
    } catch (error) {
      console.error('Permission check failed:', error);
      
      // Cache negative result to prevent repeated failures
      authCache.setPermission(user.id, page, false);
      return false;
    }
  }, [userRole, user?.id]);

  // Fast synchronous permission check (cache only)
  const hasPageAccessSync = useCallback((page: string): boolean | null => {
    if (!user?.id) return null;
    return authCache.getPermission(user.id, page);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to complete
    }

    if (!userRole || !user?.id) {
      setMenuPermissions([]);
      setLoading(false);
      return;
    }

    fetchAllPermissions(userRole, user.id);
  }, [userRole, user?.id, authLoading, fetchAllPermissions]);

  return {
    menuPermissions,
    hasPageAccess,
    hasPageAccessSync,
    loading: loading || authLoading,
  };
};