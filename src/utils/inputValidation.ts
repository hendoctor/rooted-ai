import { z } from 'zod';

// Enhanced email validation schema
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .refine((email) => {
    // Check for common suspicious patterns
    const suspiciousPatterns = [
      /\+.*\+/, // Multiple plus signs
      /\.{2,}/, // Multiple consecutive dots
      /@.*@/, // Multiple @ symbols
      /[<>]/, // HTML brackets
    ];
    return !suspiciousPatterns.some(pattern => pattern.test(email));
  }, 'Email contains invalid characters');

// Enhanced name validation schema
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .refine((name) => {
    // Prevent script injection attempts
    const forbiddenPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
    ];
    return !forbiddenPatterns.some(pattern => pattern.test(name));
  }, 'Name contains forbidden content');

// Enhanced message validation schema
export const messageSchema = z.string()
  .min(10, 'Message must be at least 10 characters')
  .max(5000, 'Message is too long')
  .trim()
  .refine((message) => {
    // Prevent script injection and SQL injection attempts
    const forbiddenPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
    ];
    return !forbiddenPatterns.some(pattern => pattern.test(message));
  }, 'Message contains forbidden content');

// Role validation schema
export const roleSchema = z.enum(['Admin', 'Client', 'Public'], {
  errorMap: () => ({ message: 'Invalid role specified' })
});

// Contact form validation schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: messageSchema,
  service_type: z.string().optional()
});

// User role update schema
export const userRoleUpdateSchema = z.object({
  email: emailSchema,
  role: roleSchema
});

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (content: string): string => {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Rate limiting helper
export const rateLimitCheck = (
  key: string, 
  maxRequests: number = 5, 
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing requests from localStorage
  const storageKey = `rate_limit_${key}`;
  const requests = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Filter requests within the time window
  const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  // Check if rate limit exceeded
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  // Add current request
  recentRequests.push(now);
  localStorage.setItem(storageKey, JSON.stringify(recentRequests));
  
  return true;
};

// Validate UUID format
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Validate VAPID key format
export const vapidPublicKeySchema = z.string()
  .regex(/^[A-Za-z0-9_-]{87}=$/, 'Invalid VAPID public key format');

export const vapidPrivateKeySchema = z.string()
  .regex(/^[A-Za-z0-9_-]{43}=$/, 'Invalid VAPID private key format');

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const storeCSRFToken = (token: string): void => {
  sessionStorage.setItem('csrf_token', token);
};

export const getCSRFToken = (): string | null => {
  return sessionStorage.getItem('csrf_token');
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken !== null && storedToken === token;
};

// Enhanced sanitization for different contexts
export const sanitizeForHTML = (content: string): string => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeForAttribute = (content: string): string => {
  return content
    .replace(/[&<>"']/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    });
};

// IP address validation and extraction
export const getClientIP = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
};

// Security event logging
export interface SecurityEvent {
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  event_details?: Record<string, any>;
}

export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    // This would typically be called from edge functions
    console.log('Security Event:', event);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};