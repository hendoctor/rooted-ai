import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    const ensureUserRole = async () => {
      if (!user?.email) return;

      // Check the users table for current role using email
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      if (existingUser && !userRole) {
        setUserRole(existingUser.role);
        return;
      }

      // No role data in profiles, user should have role in users table
      if (!userRole) {
        setUserRole('Public');
      }
    };

    ensureUserRole();
  }, [user, userRole, setUserRole]);

  return { userRole };
};