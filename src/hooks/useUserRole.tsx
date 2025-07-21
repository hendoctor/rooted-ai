import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    const ensureUserRole = async () => {
      if (!user?.email) return;

      // Check if user exists in users table
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      if (!existingUser) {
        // Create user with Public role by default
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ email: user.email, role: 'Public' })
          .select('role')
          .single();

        if (!insertError && newUser) {
          setUserRole(newUser.role);
        }
      } else if (!userRole) {
        setUserRole(existingUser.role);
      }
    };

    ensureUserRole();
  }, [user, userRole, setUserRole]);

  return { userRole };
};