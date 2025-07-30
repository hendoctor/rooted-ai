import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    const ensureUserRole = async () => {
      if (!user?.email) return;

      // Check if user profile exists
      const { data: existingUser, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      if (existingUser && !userRole) {
        setUserRole(existingUser.role);
      }
    };

    ensureUserRole();
  }, [user, userRole, setUserRole]);

  return { userRole };
};