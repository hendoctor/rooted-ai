import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useMobileOptimizations } from './useMobileOptimizations';

/**
 * Enhanced hook to handle mobile app focus/refresh scenarios
 * Includes PWA-specific optimizations and pull-to-refresh detection
 */
export const useVisibilityRefresh = () => {
  const { refreshAuth, user } = useAuth();
  const { isPWA, isStandalone, isPullToRefresh, isOnline } = useMobileOptimizations();

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if user is authenticated and page becomes visible
      if (!document.hidden && user) {
        console.log('🔄 App regained focus - refreshing auth');
        
        // Add haptic feedback for PWA
        if (isPWA && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        refreshAuth();
      }
    };

    const handleOnline = () => {
      // Refresh auth when coming back online
      if (user && isOnline) {
        console.log('🌐 App came online - refreshing auth');
        refreshAuth();
      }
    };

    const handleFocus = () => {
      // Handle PWA focus events
      if (user && (isPWA || isStandalone)) {
        console.log('📱 PWA regained focus - refreshing auth');
        refreshAuth();
      }
    };

    // Listen for visibility changes (mobile focus/blur)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    
    // Listen for PWA focus events
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAuth, user, isPWA, isStandalone, isOnline]);

  // Handle pull-to-refresh specifically
  useEffect(() => {
    if (isPullToRefresh && user) {
      console.log('⬇️ Pull-to-refresh detected - refreshing auth');
      refreshAuth();
    }
  }, [isPullToRefresh, user, refreshAuth]);
};