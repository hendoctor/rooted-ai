import { supabase } from '@/integrations/supabase/client';
import { SecurityMiddleware } from './securityMiddleware';

// Enhanced security monitoring and event logging
export class SecurityEnhancer {
  // Monitor authentication events
  static async monitorAuthEvents() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          await SecurityMiddleware.logSecurityEvent({
            event_type: 'user_login',
            event_details: {
              user_id: session?.user?.id,
              login_method: 'password',
              timestamp: new Date().toISOString()
            }
          });
          break;
        
        case 'SIGNED_OUT':
          await SecurityMiddleware.logSecurityEvent({
            event_type: 'user_logout',
            event_details: {
              user_id: session?.user?.id,
              timestamp: new Date().toISOString()
            }
          });
          break;
        
        case 'TOKEN_REFRESHED':
          // Log successful token refresh
          break;
        
        case 'PASSWORD_RECOVERY':
          await SecurityMiddleware.logSecurityEvent({
            event_type: 'password_recovery_initiated',
            event_details: {
              user_id: session?.user?.id,
              timestamp: new Date().toISOString()
            }
          });
          break;
      }
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
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !invitation) {
        await SecurityMiddleware.logSecurityEvent({
          event_type: 'invalid_invitation_token_used',
          event_details: {
            token: token.substring(0, 8) + '...',
            timestamp: new Date().toISOString()
          }
        });

        return {
          isValid: false,
          error: 'Invalid or expired invitation token'
        };
      }

      return {
        isValid: true,
        invitation
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate invitation token'
      };
    }
  }
}

// Initialize security monitoring
SecurityEnhancer.monitorAuthEvents();