// Security headers configuration for enhanced protection
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

// Apply security headers to document (but avoid meta tags for frame-related headers)
export const applySecurityHeaders = () => {
  // CSP via meta tag for client-side applications
  const cspMeta = document.createElement('meta');
  cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
  cspMeta.setAttribute('content', SECURITY_HEADERS['Content-Security-Policy']);
  document.head.appendChild(cspMeta);

  // Add referrer policy
  const referrerMeta = document.createElement('meta');
  referrerMeta.setAttribute('name', 'referrer');
  referrerMeta.setAttribute('content', 'strict-origin-when-cross-origin');
  document.head.appendChild(referrerMeta);

  // Note: X-Frame-Options and frame-ancestors should be set via HTTP headers in production
};

// Enhanced security monitoring
export const setupSecurityMonitoring = () => {
  // Monitor for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    console.warn('CSP Violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber
    });
  });

  // Monitor for suspicious activities
  let clickCount = 0;
  let lastClickTime = 0;
  
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 100) {
      clickCount++;
      if (clickCount > 10) {
        console.warn('Possible click-bombing detected');
        clickCount = 0;
      }
    } else {
      clickCount = 1;
    }
    lastClickTime = now;
  });
};