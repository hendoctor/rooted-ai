import { useEffect, useState } from 'react';

interface MobileState {
  isPWA: boolean;
  isStandalone: boolean;
  isMobileSafari: boolean;
  isOnline: boolean;
  isPullToRefresh: boolean;
}

/**
 * Hook to detect mobile-specific conditions and PWA state
 * Provides optimizations for mobile browsers and PWA environments
 */
export const useMobileOptimizations = () => {
  const [mobileState, setMobileState] = useState<MobileState>({
    isPWA: false,
    isStandalone: false,
    isMobileSafari: false,
    isOnline: navigator.onLine,
    isPullToRefresh: false
  });

  useEffect(() => {
    // Detect PWA and standalone mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Detect Mobile Safari
    const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
                          /Safari/i.test(navigator.userAgent) &&
                          !(window as any).MSStream;

    setMobileState(prev => ({
      ...prev,
      isPWA,
      isStandalone,
      isMobileSafari
    }));

    // Network state monitoring
    const handleOnline = () => setMobileState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setMobileState(prev => ({ ...prev, isOnline: false }));

    // Pull-to-refresh detection
    let pullStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      pullStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const pullDistance = e.touches[0].clientY - pullStartY;
      const isPullToRefresh = pullDistance > 100 && window.scrollY === 0;
      
      if (isPullToRefresh !== mobileState.isPullToRefresh) {
        setMobileState(prev => ({ ...prev, isPullToRefresh }));
      }
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [mobileState.isPullToRefresh]);

  return mobileState;
};