import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

export const useAuthFix = () => {
  const { toast } = useToast();

  useEffect(() => {
    const fixUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking profile:', profileError);
          return;
        }

        // Create profile if it doesn't exist
        if (!profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.email,
              email: user.email,
              role: 'client'
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else {
            console.log('Profile created successfully for user:', user.id);
          }
        }
      } catch (error) {
        console.error('Error in auth fix:', error);
      }
    };

    // Run the fix when the hook is used
    fixUserProfile();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Small delay to ensure the trigger has time to run
          setTimeout(fixUserProfile, 1000);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
};