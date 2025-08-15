import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { userRole } = useAuth();
  const [permissions, setPermissions] = useState<Tables<'role_permissions'>[]>([]);

  useEffect(() => {
    const role = userRole ?? 'Client';
    supabase
      .from('role_permissions')
      .select('*')
      .eq('role', role)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch permissions', error);
        } else {
          setPermissions(data ?? []);
        }
      });
  }, [userRole]);

  return permissions;
};
