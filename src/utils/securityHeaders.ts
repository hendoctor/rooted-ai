// DEPRECATED: Client-side security headers are not effective
// Security headers should be configured at the HTTP server level
// This file is kept for reference but headers should be set via:
// 1. Supabase Edge Functions for API endpoints
// 2. Hosting provider configuration for static assets
// 3. CloudFlare or CDN configuration

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://us-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', ')
};

// DEPRECATED: Client-side security headers are not effective
// Use this function for reference only - implement at HTTP server level
export const applySecurityHeaders = () => {
  console.warn('Security headers should be configured at HTTP server level, not client-side');
  // This function is deprecated and should not be used in production
};

// Enhanced security monitoring with better tracking
export const setupSecurityMonitoring = () => {
  // Monitor for CSP violations with enhanced logging
  document.addEventListener('securitypolicyviolation', (event) => {
    console.warn('CSP Violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      timestamp: new Date().toISOString()
    });
    
    // Log to security audit if available
    try {
      import('./securityMiddleware').then(({ SecurityMiddleware }) => {
        SecurityMiddleware.logSecurityEvent({
          event_type: 'csp_violation_client',
          event_details: {
            blocked_uri: event.blockedURI,
            violated_directive: event.violatedDirective,
            source_file: event.sourceFile,
            line_number: event.lineNumber
          }
        });
      });
    } catch (error) {
      console.error('Failed to log CSP violation:', error);
    }
  });

  // Enhanced click-bombing detection
  let clickCount = 0;
  let lastClickTime = 0;
  const clickThreshold = 15; // Increased threshold for better accuracy
  
  document.addEventListener('click', (event) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;
    
    if (timeDiff < 50) { // Very rapid clicks
      clickCount++;
      if (clickCount > clickThreshold) {
        console.warn('Possible click-bombing detected', {
          count: clickCount,
          timeWindow: timeDiff,
          element: event.target
        });
        
        // Log suspicious activity
        try {
          import('./enhancedSecurityMonitor').then(({ EnhancedSecurityMonitor }) => {
            EnhancedSecurityMonitor.logSuspiciousActivity('click_bombing', {
              click_count: clickCount,
              time_window: timeDiff,
              element_type: (event.target as Element)?.tagName
            });
          });
        } catch (error) {
          console.error('Failed to log click-bombing:', error);
        }
        
        clickCount = 0;
      }
    } else if (timeDiff > 1000) { // Reset after 1 second of normal behavior
      clickCount = 1;
    }
    lastClickTime = now;
  });
  
  // Monitor for unusual navigation patterns
  let navigationCount = 0;
  let navigationStartTime = Date.now();
  
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    navigationCount++;
    const timeSinceStart = Date.now() - navigationStartTime;
    
    // More than 20 navigations in 10 seconds
    if (navigationCount > 20 && timeSinceStart < 10000) {
      try {
        import('./enhancedSecurityMonitor').then(({ EnhancedSecurityMonitor }) => {
          EnhancedSecurityMonitor.logSuspiciousActivity('rapid_navigation', {
            navigation_count: navigationCount,
            time_window: timeSinceStart
          });
        });
      } catch (error) {
        console.error('Failed to log rapid navigation:', error);
      }
    }
    
    // Reset counter every 10 seconds
    if (timeSinceStart > 10000) {
      navigationCount = 1;
      navigationStartTime = Date.now();
    }
    
    return originalPushState.apply(this, args);
  };
};