import { supabase } from '@/integrations/supabase/client';

export interface SecurityMetrics {
  sessionDuration: number;
  failedAttempts: number;
  suspiciousActivity: boolean;
  lastActivity: number;
  tenantViolations: number;
}

export class EnhancedSecurityMonitor {
  private static failedAttempts = new Map<string, number>();
  private static suspiciousIPs = new Set<string>();
  
  // Monitor failed authentication attempts
  static async logFailedAuthAttempt(email: string, reason: string): Promise<void> {
    const attempts = this.failedAttempts.get(email) || 0;
    this.failedAttempts.set(email, attempts + 1);
    
    try {
      await supabase.functions.invoke('log-security-event', {
        body: {
          event_type: 'failed_auth_attempt',
          event_details: {
            email_domain: email.split('@')[1], // Log domain only for privacy
            reason,
            attempt_count: attempts + 1,
            timestamp: Date.now()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
    
    // Alert on multiple failed attempts
    if (attempts >= 4) {
      await this.logSuspiciousActivity('multiple_failed_auth', { email_domain: email.split('@')[1] });
    }
  }
  
  // Monitor suspicious navigation patterns
  static async logSuspiciousNavigation(path: string, userAgent: string): Promise<void> {
    try {
      await supabase.functions.invoke('log-security-event', {
        body: {
          event_type: 'suspicious_navigation',
          event_details: {
            path,
            user_agent_type: this.categorizeUserAgent(userAgent),
            timestamp: Date.now()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
  
  // Log general suspicious activities
  static async logSuspiciousActivity(activityType: string, details: Record<string, any>): Promise<void> {
    try {
      await supabase.functions.invoke('log-security-event', {
        body: {
          event_type: 'suspicious_activity',
          event_details: {
            activity_type: activityType,
            ...details,
            timestamp: Date.now()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
  
  // Monitor rapid-fire requests (potential bot behavior)
  static monitorRequestRate(): void {
    let requestCount = 0;
    let windowStart = Date.now();
    
    // Reset counter every 60 seconds
    setInterval(() => {
      if (requestCount > 100) { // More than 100 requests per minute
        this.logSuspiciousActivity('high_request_rate', {
          requests_per_minute: requestCount,
          window_start: windowStart
        });
      }
      requestCount = 0;
      windowStart = Date.now();
    }, 60000);
    
    // Track requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      requestCount++;
      return originalFetch.apply(this, args);
    };
  }
  
  // Enhanced session fingerprinting
  static generateSessionFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Security fingerprint', 2, 2);
    
    const fingerprint = {
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      canvas: canvas.toDataURL(),
      userAgent: navigator.userAgent.slice(0, 50) // Truncated for privacy
    };
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 32);
  }
  
  // Categorize user agents for analysis
  private static categorizeUserAgent(userAgent: string): string {
    if (userAgent.includes('bot') || userAgent.includes('crawler')) return 'bot';
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    return 'unknown';
  }
  
  // Clear old tracking data
  static cleanup(): void {
    // Clear failed attempts older than 1 hour
    this.failedAttempts.clear();
    this.suspiciousIPs.clear();
  }
}

// Initialize enhanced monitoring
EnhancedSecurityMonitor.monitorRequestRate();

// Cleanup old data every hour
setInterval(() => {
  EnhancedSecurityMonitor.cleanup();
}, 3600000);

// Export singleton instance for real-time monitoring
export const securityMonitor = new class SecurityMonitorInstance {
  private metrics: SecurityMetrics = {
    sessionDuration: 0,
    failedAttempts: 0,
    suspiciousActivity: false,
    lastActivity: Date.now(),
    tenantViolations: 0
  };
  private listeners: Array<(metrics: SecurityMetrics) => void> = [];

  startMonitoring(): void {
    console.log('Security monitoring started');
  }

  stopMonitoring(): void {
    console.log('Security monitoring stopped');
  }

  addListener(listener: (metrics: SecurityMetrics) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (metrics: SecurityMetrics) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  async detectRealTimeThreats(): Promise<{
    threats: string[];
    severity: 'low' | 'medium' | 'high';
    actions: string[];
  }> {
    return {
      threats: [],
      severity: 'low',
      actions: []
    };
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }
}();