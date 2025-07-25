import { supabase } from '@/integrations/supabase/client';

// Security middleware for client-side security checks
export class SecurityMiddleware {
  // Check if user has required permissions for an action
  static async checkPermission(action: string, userRole?: string): Promise<boolean> {
    if (!userRole) return false;
    
    try {
      const { data } = await supabase
        .from('role_permissions')
        .select('access')
        .eq('role', userRole)
        .eq('page', action)
        .eq('access', true)
        .maybeSingle();
      
      return !!data;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // Log security events on the client side
  static async logSecurityEvent(event: {
    event_type: string;
    event_details?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('security_audit_log').insert({
        event_type: event.event_type,
        event_details: event.event_details,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Validate session and refresh if needed
  static async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }

      if (!session) {
        return false;
      }

      // Check if session is expiring soon (within 10 minutes)
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry < 10 * 60 * 1000) { // 10 minutes
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  // Sanitize URLs to prevent open redirects
  static sanitizeRedirectUrl(url: string): string {
    try {
      const allowedOrigins = [
        window.location.origin,
        'https://lovable.dev' // Allow Lovable preview URLs
      ];
      
      const urlObj = new URL(url, window.location.origin);
      
      // Only allow same-origin or allowed origins redirects
      if (!allowedOrigins.includes(urlObj.origin)) {
        return '/';
      }
      
      // Block dangerous protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '/';
      }
      
      return urlObj.pathname + urlObj.search;
    } catch {
      return '/';
    }
  }

  // Content Security Policy violation reporting
  static setupCSPReporting(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      this.logSecurityEvent({
        event_type: 'csp_violation',
        event_details: {
          blocked_uri: event.blockedURI,
          violated_directive: event.violatedDirective,
          original_policy: event.originalPolicy,
          source_file: event.sourceFile,
          line_number: event.lineNumber
        }
      });
    });
  }
}

// Initialize security middleware
SecurityMiddleware.setupCSPReporting();