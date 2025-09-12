import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface SessionManager {
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<Session | null>;
  isSessionValid: (session: Session | null) => boolean;
  handleSessionError: (error: any) => void;
}

/**
 * Enhanced session manager with better persistence and recovery
 */
export const useSessionManager = (): SessionManager => {
  const lastValidationRef = useRef(0);
  const isValidatingRef = useRef(false);
  const VALIDATION_INTERVAL = 60000; // 1 minute between validations

  const isSessionValid = useCallback((session: Session | null): boolean => {
    if (!session?.access_token || !session?.expires_at) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    // Consider session expired if it expires within 5 minutes
    return expiresAt > (now + 300);
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Throttle validation calls
    if (isValidatingRef.current || (now - lastValidationRef.current) < VALIDATION_INTERVAL) {
      return true;
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session validation error:', error.message);
        return false;
      }

      const valid = isSessionValid(session);
      
      if (!valid && session) {
        console.log('Session expired, attempting refresh...');
        const refreshedSession = await refreshSession();
        return !!refreshedSession;
      }

      return valid;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    } finally {
      isValidatingRef.current = false;
    }
  }, [isSessionValid]);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    try {
      console.log('🔄 Refreshing session...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error.message);
        return null;
      }

      if (data.session) {
        console.log('✅ Session refreshed successfully');
        return data.session;
      }

      return null;
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  }, []);

  const handleSessionError = useCallback((error: any) => {
    console.error('Session error:', error);
    
    // Clear potentially corrupt session data
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('refresh_token_not_found')) {
      console.log('🧹 Clearing invalid session data');
      supabase.auth.signOut({ scope: 'local' });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isValidatingRef.current = false;
    };
  }, []);

  return {
    validateSession,
    refreshSession,
    isSessionValid,
    handleSessionError
  };
};