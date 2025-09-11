import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface PerformanceMetrics {
  navigationTiming?: PerformanceTiming;
  resourceTiming?: PerformanceResourceTiming[];
  marks?: PerformanceMark[];
  measures?: PerformanceMeasure[];
  coreWebVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

interface PerformanceEvent {
  type: string;
  timestamp: number;
  route: string;
  metrics: PerformanceMetrics;
  userAgent: string;
  sessionId: string;
}

export function usePerformanceMonitor() {
  // Safely handle useLocation - might be called outside Router context
  let location: { pathname: string } | null = null;
  try {
    location = useLocation();
  } catch (error) {
    // Component is not inside Router context - use fallback
    location = { pathname: window.location.pathname };
  }
  
  const sessionId = useRef(crypto.randomUUID());
  const navigationStartTime = useRef<number>();
  const routeChangeTime = useRef<number>();

  // Mark performance events
  const mark = useCallback((name: string) => {
    if (performance.mark) {
      performance.mark(name);
    }
  }, []);

  // Measure performance between marks
  const measure = useCallback((name: string, startMark: string, endMark?: string) => {
    if (performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
  }, []);

  // Get Core Web Vitals
  const getCoreWebVitals = useCallback((): Promise<{ lcp?: number; fid?: number; cls?: number }> => {
    return new Promise((resolve) => {
      const vitals = { lcp: undefined, fid: undefined, cls: undefined };
      let resolveTimeout: NodeJS.Timeout;

      // Set a timeout to resolve even if not all metrics are available
      resolveTimeout = setTimeout(() => resolve(vitals), 2000);

      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            vitals.lcp = lastEntry.startTime;
            
            if (vitals.lcp !== undefined && vitals.fid !== undefined && vitals.cls !== undefined) {
              clearTimeout(resolveTimeout);
              resolve(vitals);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              vitals.fid = (entry as any).processingStart - entry.startTime;
            });
            
            if (vitals.lcp !== undefined && vitals.fid !== undefined && vitals.cls !== undefined) {
              clearTimeout(resolveTimeout);
              resolve(vitals);
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
            
            if (vitals.lcp !== undefined && vitals.fid !== undefined && vitals.cls !== undefined) {
              clearTimeout(resolveTimeout);
              resolve(vitals);
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Core Web Vitals measurement failed:', error);
          clearTimeout(resolveTimeout);
          resolve(vitals);
        }
      } else {
        clearTimeout(resolveTimeout);
        resolve(vitals);
      }
    });
  }, []);

  // Collect performance metrics
  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    const metrics: PerformanceMetrics = {};

    // Navigation timing
    if (performance.timing) {
      metrics.navigationTiming = performance.timing;
    }

    // Resource timing
    if (performance.getEntriesByType) {
      try {
        metrics.resourceTiming = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      } catch (error) {
        console.warn('Failed to get resource timing:', error);
      }
    }

    // Marks and measures
    if (performance.getEntriesByType) {
      try {
        metrics.marks = performance.getEntriesByType('mark') as PerformanceMark[];
        metrics.measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
      } catch (error) {
        console.warn('Failed to get marks/measures:', error);
      }
    }

    // Core Web Vitals
    try {
      metrics.coreWebVitals = await getCoreWebVitals();
    } catch (error) {
      console.warn('Failed to get Core Web Vitals:', error);
    }

    return metrics;
  }, [getCoreWebVitals]);

  // Log performance event
  const logPerformanceEvent = useCallback(async (type: string) => {
    try {
      const metrics = await collectMetrics();
      
      const event: PerformanceEvent = {
        type,
        timestamp: Date.now(),
        route: location?.pathname || '/',
        metrics,
        userAgent: navigator.userAgent,
        sessionId: sessionId.current
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚀 Performance Event: ${type}`);
        console.log('Route:', event.route);
        console.log('Metrics:', event.metrics);
        
        if (event.metrics.coreWebVitals) {
          const { lcp, fid, cls } = event.metrics.coreWebVitals;
          console.log('Core Web Vitals:', {
            LCP: lcp ? `${lcp.toFixed(2)}ms` : 'N/A',
            FID: fid ? `${fid.toFixed(2)}ms` : 'N/A',
            CLS: cls ? cls.toFixed(3) : 'N/A'
          });
        }
        console.groupEnd();
      }

      // Send to analytics endpoint (in production)
      if (process.env.NODE_ENV === 'production') {
        // This would typically send to your analytics service
        // For now, we'll just store in localStorage for demo purposes
        const existingEvents = JSON.parse(localStorage.getItem('performance_events') || '[]');
        existingEvents.push(event);
        
        // Keep only the last 50 events
        if (existingEvents.length > 50) {
          existingEvents.splice(0, existingEvents.length - 50);
        }
        
        localStorage.setItem('performance_events', JSON.stringify(existingEvents));
      }
    } catch (error) {
      console.warn('Failed to log performance event:', error);
    }
  }, [location?.pathname, collectMetrics]);

  // Track navigation start
  useEffect(() => {
    navigationStartTime.current = performance.now();
    mark('navigation-start');
  }, [mark]);

  // Track route changes
  useEffect(() => {
    if (routeChangeTime.current) {
      // This is a route change, not initial load
      mark('route-change-start');
      
      // Measure route change time after a short delay
      setTimeout(() => {
        mark('route-change-end');
        measure('route-change-duration', 'route-change-start', 'route-change-end');
        logPerformanceEvent('route-change');
      }, 100);
    }
    
    routeChangeTime.current = performance.now();
  }, [location?.pathname, mark, measure, logPerformanceEvent]);

  // Track page load completion
  useEffect(() => {
    const handleLoad = () => {
      mark('page-load-complete');
      if (navigationStartTime.current) {
        measure('total-load-time', 'navigation-start', 'page-load-complete');
      }
      logPerformanceEvent('page-load');
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [mark, measure, logPerformanceEvent]);

  // Track component mount/unmount
  const trackComponent = useCallback((componentName: string) => {
    mark(`${componentName}-mount`);
    
    return () => {
      mark(`${componentName}-unmount`);
      measure(`${componentName}-lifetime`, `${componentName}-mount`, `${componentName}-unmount`);
    };
  }, [mark, measure]);

  // Track user interactions
  const trackInteraction = useCallback((action: string, target?: string) => {
    mark(`interaction-${action}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`👆 User Interaction: ${action}${target ? ` on ${target}` : ''}`);
    }
    
    // Log interaction performance if it affects navigation
    if (['click', 'submit'].includes(action)) {
      setTimeout(() => {
        logPerformanceEvent(`interaction-${action}`);
      }, 50);
    }
  }, [mark, logPerformanceEvent]);

  // Get performance summary
  const getPerformanceSummary = useCallback(async () => {
    const metrics = await collectMetrics();
    
    const summary = {
      route: location?.pathname || '/',
      loadTime: navigationStartTime.current ? performance.now() - navigationStartTime.current : null,
      coreWebVitals: metrics.coreWebVitals,
      resourceCount: metrics.resourceTiming?.length || 0,
      marks: metrics.marks?.length || 0,
      measures: metrics.measures?.length || 0
    };

    return summary;
  }, [location?.pathname, collectMetrics]);

  // Auth-specific tracking methods
  const trackAuthInit = useCallback(() => {
    mark('auth-init');
  }, [mark]);

  const trackAuthComplete = useCallback(() => {
    mark('auth-complete');
    measure('auth-init-duration', 'auth-init', 'auth-complete');
  }, [mark, measure]);

  const trackProfileFetch = useCallback(() => {
    mark('profile-fetch-start');
  }, [mark]);

  const trackProfileComplete = useCallback(() => {
    mark('profile-fetch-complete');
    measure('profile-fetch-duration', 'profile-fetch-start', 'profile-fetch-complete');
  }, [mark, measure]);

  const trackTotalLoad = useCallback(() => {
    mark('total-auth-load-start');
  }, [mark]);

  const trackTotalComplete = useCallback(() => {
    mark('total-auth-load-complete');
    measure('total-auth-load-duration', 'total-auth-load-start', 'total-auth-load-complete');
  }, [mark, measure]);

  return {
    mark,
    measure,
    trackComponent,
    trackInteraction,
    logPerformanceEvent,
    getPerformanceSummary,
    sessionId: sessionId.current,
    // Auth-specific methods
    trackAuthInit,
    trackAuthComplete,
    trackProfileFetch,
    trackProfileComplete,
    trackTotalLoad,
    trackTotalComplete
  };
}
