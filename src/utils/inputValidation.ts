import { z } from 'zod';

// Email validation schema
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email is too long');

// Name validation schema
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

// Message validation schema
export const messageSchema = z.string()
  .min(10, 'Message must be at least 10 characters')
  .max(5000, 'Message is too long')
  .trim();

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