import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    const ensureUserRole = async () => {
      if (!user?.email) return;

      // Check the users table first for the current role
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (profileData && !userRole) {
        const normalised =
          profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1).toLowerCase();
        setUserRole(normalised);
      }
    };

    ensureUserRole();
  }, [user, userRole, setUserRole]);

  return { userRole };
};