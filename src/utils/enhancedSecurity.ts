// Enhanced Security Utilities
import { supabase } from "@/integrations/supabase/client";

// Comprehensive input sanitization
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim()
    .substring(0, maxLength);
};

// Enhanced email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) return { isValid: false, error: 'Email is required' };
  if (email.length > 254) return { isValid: false, error: 'Email too long' };
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.{2,}/, // Multiple consecutive dots
    /@.*@/, // Multiple @ symbols
    /^\./, // Starting with dot
    /\.$/, // Ending with dot
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
  }
  
  return { isValid: true };
};

// Enhanced password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (password.length > 128) errors.push('Password must not exceed 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^.*(012|123|234|345|456|567|678|789|890).*$/, // Sequential numbers
    /^.*(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz).*$/i, // Sequential letters
    /^(.)\1{2,}/, // Repeated characters
    /(password|123456|qwerty|admin|login)/i, // Common passwords
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common weak pattern');
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// Security event logging with rate limiting
let lastLogTime = 0;
const LOG_COOLDOWN_MS = 1000; // 1 second between logs

export const logSecurityEvent = async (
  eventType: string, 
  details?: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  const now = Date.now();
  if (now - lastLogTime < LOG_COOLDOWN_MS) return; // Rate limit logging
  
  lastLogTime = now;
  
  try {
    await supabase.functions.invoke('log-security-event', {
      body: {
        event_type: eventType,
        event_details: {
          ...details,
          severity,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href
        }
      }
    });
  } catch (error) {
    console.warn('Failed to log security event:', error);
  }
};

// Session fingerprinting for enhanced security
export const generateSessionFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    navigator.maxTouchPoints?.toString() || 'unknown'
  ];
  
  // Simple hash function for fingerprinting
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
};

// Enhanced form validation
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    sanitize?: boolean;
  }>
): { isValid: boolean; errors: Record<string, string>; sanitizedData: Record<string, any> } => {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};
  
  for (const [field, value] of Object.entries(data)) {
    const rule = rules[field];
    if (!rule) continue;
    
    let processedValue = value;
    
    // Required field check
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} is required`;
      continue;
    }
    
    // Skip further validation if field is empty and not required
    if (!value || value.toString().trim() === '') {
      sanitizedData[field] = '';
      continue;
    }
    
    const stringValue = value.toString();
    
    // Length validation
    if (rule.minLength && stringValue.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }
    
    if (rule.maxLength && stringValue.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      errors[field] = `${field} format is invalid`;
    }
    
    // Sanitization
    if (rule.sanitize) {
      processedValue = sanitizeInput(stringValue, rule.maxLength);
    }
    
    sanitizedData[field] = processedValue;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};

// Client-side rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const entry = requestCounts.get(key);
  
  if (!entry || now > entry.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
};