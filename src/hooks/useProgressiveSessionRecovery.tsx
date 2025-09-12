import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RecoveryState {
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
}

/**
 * Progressive session recovery that handles session corruption gracefully
 */
export const useProgressiveSessionRecovery = () => {
  const { user, loading, error, refreshAuth } = useAuth();
  const recoveryStateRef = useRef<RecoveryState>({
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: 0
  });

  const MAX_RECOVERY_ATTEMPTS = 3;
  const RECOVERY_COOLDOWN = 60000; // 1 minute between recovery attempts

  const attemptRecovery = useCallback(async (reason: string) => {
    const now = Date.now();
    const state = recoveryStateRef.current;

    // Check cooldown and attempt limits
    if (state.isRecovering || 
        state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS ||
        (now - state.lastRecoveryTime) < RECOVERY_COOLDOWN) {
      return false;
    }

    console.log(`🩹 Attempting session recovery (${reason})`);
    
    state.isRecovering = true;
    state.recoveryAttempts++;
    state.lastRecoveryTime = now;

    try {
      // Step 1: Clear potentially corrupt local session
      await supabase.auth.signOut({ scope: 'local' });
      
      // Step 2: Brief pause to allow state clearing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Try to restore from server
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Recovery failed - server session invalid:', error.message);
        return false;
      }

      if (session) {
        console.log('✅ Session recovered from server');
        // Trigger auth refresh with recovered session
        await refreshAuth();
        
        // Reset recovery state on success
        state.recoveryAttempts = 0;
        return true;
      }

      console.log('ℹ️ No session to recover - user needs to sign in');
      return false;
      
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return false;
    } finally {
      state.isRecovering = false;
    }
  }, [refreshAuth]);

  // Monitor for session corruption indicators
  useEffect(() => {
    if (!loading && user && error) {
      const errorMessage = error.toLowerCase();
      
      // Check for session-related errors
      const isSessionError = errorMessage.includes('session') ||
                            errorMessage.includes('token') ||
                            errorMessage.includes('unauthorized') ||
                            errorMessage.includes('invalid') ||
                            errorMessage.includes('expired');

      if (isSessionError) {
        console.log('🚨 Session error detected, attempting recovery...');
        attemptRecovery('session_error');
      }
    }
  }, [loading, user, error, attemptRecovery]);

  // Monitor for loading state that gets stuck
  useEffect(() => {
    if (loading && !recoveryStateRef.current.isRecovering) {
      // Set a timeout to detect stuck loading states
      const timeout = setTimeout(() => {
        if (loading && !user) {
          console.log('🚨 Stuck loading state detected');
          attemptRecovery('stuck_loading');
        }
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [loading, user, attemptRecovery]);

  // Reset recovery state on successful auth
  useEffect(() => {
    if (user && !loading && !error) {
      recoveryStateRef.current.recoveryAttempts = 0;
    }
  }, [user, loading, error]);

  return {
    isRecovering: recoveryStateRef.current.isRecovering,
    recoveryAttempts: recoveryStateRef.current.recoveryAttempts,
    maxAttempts: MAX_RECOVERY_ATTEMPTS,
    attemptRecovery
  };
};