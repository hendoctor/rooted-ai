import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthSecureV2';
import type { Tables } from '@/integrations/supabase/types';

interface MenuPermission {
  page: string;
  menu_item: string;
  visible: boolean;
  access: boolean;
}

export const useRolePermissions = () => {
  const { userRole } = useAuth();
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!userRole) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select('page, menu_item, visible, access')
        .eq('role', userRole)
        .eq('visible', true)
        .not('menu_item', 'is', null);

      if (!error && data) {
        setMenuPermissions(data);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [userRole]);

  const hasPageAccess = async (page: string): Promise<boolean> => {
    if (!userRole) return false;

    const { data, error } = await supabase
      .from('role_permissions')
      .select('access')
      .eq('role', userRole)
      .eq('page', page)
      .eq('access', true)
      .maybeSingle();

    return !error && !!data;
  };

  return {
    menuPermissions,
    hasPageAccess,
    loading
  };
};