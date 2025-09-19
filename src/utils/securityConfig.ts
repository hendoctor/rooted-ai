// Security configuration constants
export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  },

  // Enhanced rate limiting
  RATE_LIMITS: {
    CONTACT_FORM: {
      MAX_REQUESTS: 3, // Reduced from 5
      WINDOW_SECONDS: 600 // Increased to 10 minutes
    },
    LOGIN_ATTEMPTS: {
      MAX_REQUESTS: 5, // Reduced from 10
      WINDOW_SECONDS: 1800 // Increased to 30 minutes
    },
    PASSWORD_RESET: {
      MAX_REQUESTS: 2, // Reduced from 3
      WINDOW_SECONDS: 3600 // 1 hour
    },
    INVITATION_ATTEMPTS: {
      MAX_REQUESTS: 5,
      WINDOW_SECONDS: 900 // 15 minutes
    }
  },

  // Session management
  SESSION: {
    REFRESH_THRESHOLD_MINUTES: 10,
    IDLE_TIMEOUT_MINUTES: 30,
    MAX_SESSION_DURATION_HOURS: 24
  },

  // Input validation
  VALIDATION: {
    EMAIL_MAX_LENGTH: 254,
    NAME_MAX_LENGTH: 100,
    MESSAGE_MAX_LENGTH: 5000,
    MESSAGE_MIN_LENGTH: 10
  },

  // Allowed origins for CORS and redirects
  ALLOWED_ORIGINS: [
    'https://lovable.dev',
    'https://app.lovable.dev'
  ],

  // Enhanced Content Security Policy (stricter configuration)
  CSP: {
    SCRIPT_SRC: ["'self'", "https://js.stripe.com"],
    STYLE_SRC: ["'self'", "https://fonts.googleapis.com"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    IMG_SRC: ["'self'", "data:", "https:"],
    CONNECT_SRC: ["'self'", "https://*.supabase.co", "https://api.stripe.com"],
    OBJECT_SRC: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
    FRAME_ANCESTORS: ["'none'"],
    UPGRADE_INSECURE_REQUESTS: true
  }
};

// Enhanced password validation function
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const config = SECURITY_CONFIG.PASSWORD;

  if (password.length < config.MIN_LENGTH) {
    errors.push(`Password must be at least ${config.MIN_LENGTH} characters long`);
  }

  if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.REQUIRE_SPECIAL_CHARS && !new RegExp(`[${config.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check if origin is allowed
export const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return false;
  
  // Always allow same origin
  if (typeof window !== 'undefined' && origin === window.location.origin) {
    return true;
  }

  // Check against allowed origins
  return SECURITY_CONFIG.ALLOWED_ORIGINS.some(allowedOrigin => 
    origin === allowedOrigin || origin.endsWith('.lovable.dev')
  );
};

// Generate secure CORS headers
export const generateCorsHeaders = (origin?: string) => {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': origin && isAllowedOrigin(origin) ? 'true' : 'false'
  };
};