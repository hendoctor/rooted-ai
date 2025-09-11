import { useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to handle mobile app focus/refresh scenarios
 * Refreshes auth data when the app regains visibility
 */
export const useVisibilityRefresh = () => {
  const { refreshAuth, user } = useAuth();

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if user is authenticated and page becomes visible
      if (!document.hidden && user) {
        console.log('🔄 App regained focus - refreshing auth');
        refreshAuth();
      }
    };

    const handleOnline = () => {
      // Refresh auth when coming back online
      if (user) {
        console.log('🌐 App came online - refreshing auth');
        refreshAuth();
      }
    };

    // Listen for visibility changes (mobile focus/blur)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshAuth, user]);
};