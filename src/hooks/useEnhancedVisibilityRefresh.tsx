import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useMobileOptimizations } from './useMobileOptimizations';
import { useSessionManager } from './useSessionManager';

/**
 * Enhanced visibility refresh with smarter session handling
 * Only refreshes when actually needed and prevents auth loops
 */
export const useEnhancedVisibilityRefresh = () => {
  const { refreshAuth, user, loading, authReady } = useAuth();
  const { isPWA, isStandalone, isPullToRefresh, isOnline } = useMobileOptimizations();
  const { validateSession, handleSessionError } = useSessionManager();

  const lastRefreshRef = useRef(0);
  const inFlightRef = useRef(false);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout>();
  
  // More conservative refresh intervals
  const MIN_INTERVAL = 30000; // 30s between refreshes
  const VISIBILITY_DELAY = 2000; // 2s delay after visibility change

  const smartRefresh = useCallback(async (reason: string) => {
    // Skip if conditions aren't met
    if (!user || !authReady || loading || inFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_INTERVAL) {
      console.log(`⏭️ Refresh throttled (${reason})`);
      return;
    }

    inFlightRef.current = true;
    console.log(`🔄 Smart refresh triggered (${reason})`);

    try {
      // First validate session without triggering full refresh
      const isValid = await validateSession();
      
      if (isValid) {
        console.log('✅ Session is valid, no refresh needed');
        return;
      }

      // Only refresh if session is actually invalid
      console.log('⚠️ Session invalid, performing auth refresh...');
      await refreshAuth();
      
    } catch (error) {
      console.warn('Smart refresh error:', error);
      handleSessionError(error);
    } finally {
      lastRefreshRef.current = Date.now();
      inFlightRef.current = false;
    }
  }, [user, authReady, loading, validateSession, refreshAuth, handleSessionError]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any pending visibility timeout
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }

      // Only refresh when page becomes visible
      if (!document.hidden) {
        // Add delay to prevent rapid refresh cycles
        visibilityTimeoutRef.current = setTimeout(() => {
          if (isPWA && 'vibrate' in navigator) {
            navigator.vibrate(30);
          }
          smartRefresh('visibilitychange');
        }, VISIBILITY_DELAY);
      }
    };

    const handleOnline = () => {
      if (isOnline && !document.hidden) {
        // Only refresh if we're online AND visible
        smartRefresh('online');
      }
    };

    const handleFocus = () => {
      // More conservative focus handling
      if ((isPWA || isStandalone) && !document.hidden) {
        smartRefresh('focus');
      }
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isPWA, isStandalone, isOnline, smartRefresh]);

  // Handle pull-to-refresh with validation
  useEffect(() => {
    if (isPullToRefresh && !document.hidden) {
      smartRefresh('pull-to-refresh');
    }
  }, [isPullToRefresh, smartRefresh]);
};