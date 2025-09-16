import { supabase } from '@/integrations/supabase/client';
import { SecurityMiddleware } from './securityMiddleware';

// Enhanced security monitoring and event logging
export class SecurityEnhancer {
  // Monitor authentication events
  static async monitorAuthEvents() {
    supabase.auth.onAuthStateChange((event, session) => {
      // Use setTimeout to defer logging and avoid blocking auth state changes
      setTimeout(() => {
        switch (event) {
          case 'SIGNED_IN':
            SecurityMiddleware.logSecurityEvent({
              event_type: 'user_login',
              event_details: {
                user_id: session?.user?.id,
                login_method: 'password',
                timestamp: new Date().toISOString()
              }
            }).catch(err => console.error('Failed to log login event:', err));
            break;
          
          case 'SIGNED_OUT':
            SecurityMiddleware.logSecurityEvent({
              event_type: 'user_logout',
              event_details: {
                user_id: session?.user?.id,
                timestamp: new Date().toISOString()
              }
            }).catch(err => console.error('Failed to log logout event:', err));
            break;
          
          case 'TOKEN_REFRESHED':
            // Log successful token refresh
            break;
          
          case 'PASSWORD_RECOVERY':
            SecurityMiddleware.logSecurityEvent({
              event_type: 'password_recovery_initiated',
              event_details: {
                user_id: session?.user?.id,
                timestamp: new Date().toISOString()
              }
            }).catch(err => console.error('Failed to log recovery event:', err));
            break;
        }
      }, 0);
    });
  }

  // Enhanced password validation with security checks
  static validatePasswordSecurity(password: string): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isSecure = true;

    // Check for common patterns
    const commonPatterns = [
      /^password/i,
      /^123456/,
      /^qwerty/i,
      /^admin/i,
      /^letmein/i
    ];

    commonPatterns.forEach(pattern => {
      if (pattern.test(password)) {
        warnings.push('Password contains common patterns that are easily guessed');
        isSecure = false;
      }
    });

    // Check for keyboard patterns
    const keyboardPatterns = ['qwerty', 'asdf', '1234', 'abcd'];
    keyboardPatterns.forEach(pattern => {
      if (password.toLowerCase().includes(pattern)) {
        warnings.push('Password contains keyboard patterns');
        isSecure = false;
      }
    });

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      warnings.push('Password contains repeated characters');
      isSecure = false;
    }

    return { isSecure, warnings };
  }

  // Monitor failed authentication attempts
  static async logFailedAuth(email: string, reason: string) {
    await SecurityMiddleware.logSecurityEvent({
      event_type: 'authentication_failed',
      event_details: {
        email,
        reason,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP()
      }
    });
  }

  // Get client IP (simplified for client-side)
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // Validate invitation tokens with enhanced security
  static async validateInvitationToken(token: string): Promise<{
    isValid: boolean;
    invitation?: any;
    error?: string;
  }> {
    try {
      // Use the new secure validation function
      const { data, error } = await supabase.rpc('validate_invitation_secure', {
        token_input: token
      });

      if (error) {
        console.error('Invitation validation error:', error);
        return {
          isValid: false,
          error: 'Failed to validate invitation token'
        };
      }

      const result = data as { valid: boolean; invitation?: any; error?: string };
      
      return {
        isValid: result.valid,
        invitation: result.invitation,
        error: result.error
      };
    } catch (error) {
      console.error('Invitation validation failed:', error);
      return {
        isValid: false,
        error: 'Failed to validate invitation token'
      };
    }
  }
}

// Initialize security monitoring
SecurityEnhancer.monitorAuthEvents();