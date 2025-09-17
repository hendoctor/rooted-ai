import { supabase } from '@/integrations/supabase/client';

export interface TenantValidationResult {
  isValid: boolean;
  companyId?: string;
  userRole?: string;
  error?: string;
}

export class TenantSecurityManager {
  private static tenantCache = new Map<string, { companyId: string; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate tenant access for the current user
   */
  static async validateTenantAccess(companyId: string): Promise<TenantValidationResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { isValid: false, error: 'User not authenticated' };
      }

      // Check cache first
      const cacheKey = `${user.id}-${companyId}`;
      const cached = this.tenantCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { isValid: true, companyId: cached.companyId };
      }

      // Validate company membership using direct query
      const { data, error } = await supabase
        .from('company_memberships')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Tenant validation error:', error);
        return { isValid: false, error: 'Validation failed' };
      }

      if (!data) {
        // Log unauthorized access attempt
        await this.logSecurityEvent('unauthorized_tenant_access', {
          user_id: user.id,
          company_id: companyId,
          timestamp: new Date().toISOString()
        });
        
        return { isValid: false, error: 'Access denied' };
      }

      // Cache successful validation
      this.tenantCache.set(cacheKey, {
        companyId,
        timestamp: Date.now()
      });

      return { isValid: true, companyId };
    } catch (error) {
      console.error('Tenant security error:', error);
      return { isValid: false, error: 'Security check failed' };
    }
  }

  /**
   * Clear tenant cache for a user
   */
  static clearTenantCache(userId?: string): void {
    if (userId) {
      for (const key of this.tenantCache.keys()) {
        if (key.startsWith(userId)) {
          this.tenantCache.delete(key);
        }
      }
    } else {
      this.tenantCache.clear();
    }
  }

  /**
   * Validate data access with tenant isolation
   */
  static async validateDataAccess(resource: string, resourceId: string, companyId: string): Promise<boolean> {
    try {
      // First validate tenant access
      const tenantValidation = await this.validateTenantAccess(companyId);
      if (!tenantValidation.isValid) {
        return false;
      }

      // Log data access attempt
      await this.logSecurityEvent('data_access_attempt', {
        resource,
        resource_id: resourceId,
        company_id: companyId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Data access validation error:', error);
      return false;
    }
  }

  /**
   * Log security events for audit trail
   */
  private static async logSecurityEvent(eventType: string, details: Record<string, any>): Promise<void> {
    try {
      await supabase.functions.invoke('log-security-event', {
        body: {
          event_type: eventType,
          event_details: details
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break functionality
    }
  }

  /**
   * Generate audit report for tenant access
   */
  static async generateAuditReport(companyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .contains('event_details', { company_id: companyId })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Audit report generation error:', error);
      return [];
    }
  }

  /**
   * Detect suspicious tenant access patterns
   */
  static async detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('event_details')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString())
        .eq('event_type', 'unauthorized_tenant_access');

      if (error) {
        throw error;
      }

      // Flag as suspicious if more than 5 unauthorized attempts in last hour
      return (data?.length || 0) > 5;
    } catch (error) {
      console.error('Suspicious activity detection error:', error);
      return false;
    }
  }
}