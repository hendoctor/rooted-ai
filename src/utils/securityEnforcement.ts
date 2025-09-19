// Enhanced security enforcement utilities
import { SECURITY_CONFIG } from './securityConfig';

// CSP Header generator for enhanced security
export const generateEnhancedCSPHeader = (): string => {
  const csp = SECURITY_CONFIG.CSP;
  
  const directives = [
    `default-src 'self'`,
    `script-src ${csp.SCRIPT_SRC.join(' ')}`,
    `style-src ${csp.STYLE_SRC.join(' ')}`,
    `font-src ${csp.FONT_SRC.join(' ')}`,
    `img-src ${csp.IMG_SRC.join(' ')}`,
    `connect-src ${csp.CONNECT_SRC.join(' ')}`,
    `object-src ${csp.OBJECT_SRC.join(' ')}`,
    `base-uri ${csp.BASE_URI.join(' ')}`,
    `form-action ${csp.FORM_ACTION.join(' ')}`,
    `frame-ancestors ${csp.FRAME_ANCESTORS.join(' ')}`
  ];

  if (csp.UPGRADE_INSECURE_REQUESTS) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
};

// Enhanced input sanitization
export const sanitizeInput = (input: string, type: 'html' | 'attribute' | 'css' = 'html'): string => {
  if (!input || typeof input !== 'string') return '';

  switch (type) {
    case 'html':
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/&/g, '&amp;');

    case 'attribute':
      return input
        .replace(/[<>"'&]/g, (char) => {
          const charMap: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return charMap[char] || char;
        });

    case 'css':
      // Remove potentially dangerous CSS characters
      return input
        .replace(/[<>"'&\\\0]/g, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/data\s*:/gi, '');

    default:
      return input;
  }
};

// URL validation for redirect security
export const validateRedirectUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // Only allow same origin or explicitly allowed origins
    return SECURITY_CONFIG.ALLOWED_ORIGINS.some(origin => 
      parsedUrl.origin === origin || parsedUrl.origin === window.location.origin
    );
  } catch {
    return false;
  }
};

// Enhanced rate limiting with exponential backoff
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests: { [key: string]: number[] } = {};
  
  return (key: string): { allowed: boolean; retryAfter?: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests[key]) {
      requests[key] = [];
    }
    
    // Clean old requests
    requests[key] = requests[key].filter(time => time > windowStart);
    
    if (requests[key].length >= maxRequests) {
      const oldestRequest = Math.min(...requests[key]);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    requests[key].push(now);
    return { allowed: true };
  };
};

// Secure event listener manager
export class SecureEventManager {
  private listeners: Map<string, Set<EventListener>> = new Map();
  
  addEventListener(element: EventTarget, event: string, listener: EventListener, options?: AddEventListenerOptions): void {
    const key = `${element.constructor.name}-${event}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(listener);
    element.addEventListener(event, listener, options);
  }
  
  removeEventListener(element: EventTarget, event: string, listener: EventListener): void {
    const key = `${element.constructor.name}-${event}`;
    
    if (this.listeners.has(key)) {
      this.listeners.get(key)!.delete(listener);
    }
    
    element.removeEventListener(event, listener);
  }
  
  removeAllListeners(): void {
    // Cannot actually remove listeners without references to elements
    // This is a limitation of the Web API, but we can clear our tracking
    this.listeners.clear();
  }
}

// Create singleton instance
export const secureEventManager = new SecureEventManager();