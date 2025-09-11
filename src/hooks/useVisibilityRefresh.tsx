import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useMobileOptimizations } from './useMobileOptimizations';

/**
 * Enhanced hook to handle mobile app focus/refresh scenarios
 * Throttled to prevent rapid re-auth loops and UI flicker
 */
export const useVisibilityRefresh = () => {
  const { refreshAuth, user } = useAuth();
  const { isPWA, isStandalone, isPullToRefresh, isOnline } = useMobileOptimizations();

  const lastRefreshRef = useRef(0);
  const inFlightRef = useRef(false);
  const MIN_INTERVAL = 15000; // 15s throttle between refreshes

  const tryRefresh = (reason: string) => {
    if (!user) return;
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastRefreshRef.current < MIN_INTERVAL) return;

    inFlightRef.current = true;
    console.log(`🔄 Auth refresh triggered (${reason})`);

    Promise.resolve(refreshAuth())
      .catch((e) => console.warn('Auth refresh error (ignored):', e))
      .finally(() => {
        lastRefreshRef.current = Date.now();
        inFlightRef.current = false;
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
  }, [isPWA, isStandalone, isOnline, refreshAuth, user]);

  // Handle pull-to-refresh specifically (also throttled)
  useEffect(() => {
    if (isPullToRefresh) {
      tryRefresh('pull-to-refresh');
    }
  }, [isPullToRefresh]);
};
