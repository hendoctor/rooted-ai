import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityMiddleware } from '@/utils/securityMiddleware';
import { SECURITY_CONFIG } from '@/utils/securityConfig';
import { useToast } from '@/hooks/use-toast';

interface SessionWarning {
  type: 'expiring' | 'idle';
  message: string;
  action?: () => void;
}

export const useSecureSession = () => {
  const [sessionWarning, setSessionWarning] = useState<SessionWarning | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const { toast } = useToast();

  // Update last activity time
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Check for idle timeout
  const checkIdleTimeout = useCallback(() => {
    const idleTime = Date.now() - lastActivity;
    const idleTimeoutMs = SECURITY_CONFIG.SESSION.IDLE_TIMEOUT_MINUTES * 60 * 1000;

    if (idleTime > idleTimeoutMs) {
      // Session is idle, sign out user
      supabase.auth.signOut();
      toast({
        title: "Session Expired",
        description: "You've been signed out due to inactivity.",
        variant: "destructive",
      });
    } else if (idleTime > idleTimeoutMs * 0.8) {
      // Warn user about upcoming idle timeout
      const remainingMinutes = Math.ceil((idleTimeoutMs - idleTime) / 60000);
      setSessionWarning({
        type: 'idle',
        message: `Your session will expire in ${remainingMinutes} minutes due to inactivity.`,
        action: updateActivity
      });
    }
  }, [lastActivity, toast, updateActivity]);

  // Validate session and check for expiration
  const validateSession = useCallback(async () => {
    try {
      const isValid = await SecurityMiddleware.validateSession();
      
      if (!isValid) {
        toast({
          title: "Session Invalid",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }

    // Check if session is expiring soon
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const warningThreshold = SECURITY_CONFIG.SESSION.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

      if (timeUntilExpiry < warningThreshold && timeUntilExpiry > 0) {
        const remainingMinutes = Math.ceil(timeUntilExpiry / 60000);
        setSessionWarning({
          type: 'expiring',
          message: `Your session will expire in ${remainingMinutes} minutes.`,
          action: async () => {
            const { error } = await supabase.auth.refreshSession();
            if (!error) {
              setSessionWarning(null);
              toast({
                title: "Session Refreshed",
                description: "Your session has been extended.",
              });
            }
          }
        });
      }
    }

    return true;
  }, [toast]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      updateActivity();
      // Clear warnings on activity
      if (sessionWarning?.type === 'idle') {
        setSessionWarning(null);
      }
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
  }, [updateActivity, sessionWarning]);

  // Set up periodic checks
  useEffect(() => {
    const interval = setInterval(() => {
      checkIdleTimeout();
      validateSession();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkIdleTimeout, validateSession]);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setSessionWarning(null);
  }, []);

  // Extend session
  const extendSession = useCallback(async () => {
    if (sessionWarning?.action) {
      await sessionWarning.action();
    }
  }, [sessionWarning]);

  return {
    sessionWarning,
    dismissWarning,
    extendSession,
    updateActivity
  };
};