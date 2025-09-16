import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useMobileOptimizations } from './useMobileOptimizations';

/**
 * Enhanced hook to handle mobile app focus/refresh scenarios
 * Throttled to prevent rapid re-auth loops and UI flicker
 */
export const useVisibilityRefresh = () => {
  const { refreshAuth, user, loading } = useAuth();
  const { isPWA, isStandalone, isPullToRefresh, isOnline } = useMobileOptimizations();

  const lastRefreshRef = useRef(0);
  const inFlightRef = useRef(false);
  const MIN_INTERVAL = 30000; // 30s throttle between refreshes (increased from 15s)

  const tryRefresh = (reason: string) => {
    if (!user) return;
    if (loading) return; // Skip refresh if already loading
    if (!navigator.onLine) return; // Skip if offline
    
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastRefreshRef.current < MIN_INTERVAL) return;

    inFlightRef.current = true;
    console.debug(`🔄 Auth refresh triggered (${reason})`);

    Promise.resolve(refreshAuth())
      .catch((e) => console.warn('Auth refresh error (ignored):', e))
      .finally(() => {
        lastRefreshRef.current = Date.now();
        inFlightRef.current = false;
        console.debug(`✅ Auth refresh completed (${reason})`);
      });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if page becomes visible
      if (!document.hidden) {
        if (isPWA && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
        tryRefresh('visibilitychange');
      }
    };

    const handleOnline = () => {
      if (isOnline) {
        tryRefresh('online');
      }
    };

    const handleFocus = () => {
      if (isPWA || isStandalone) {
        tryRefresh('focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPWA, isStandalone, isOnline, refreshAuth, user, loading]);

  // Handle pull-to-refresh specifically (also throttled)
  useEffect(() => {
    if (isPullToRefresh) {
      tryRefresh('pull-to-refresh');
    }
  }, [isPullToRefresh]);
};
