// Activity logging utility for tracking user actions
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  company_id?: string;
  company_name?: string;
  activity_type: string;
  activity_description?: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export type ActivityType = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'PAGE_VIEW' 
  | 'DATA_ACCESS' 
  | 'ADMIN_ACTION' 
  | 'COMPANY_ACCESS'
  | 'PORTAL_VIEW'
  | 'SETTINGS_CHANGE'
  | 'USER_MANAGEMENT'
  | 'INVITATION_SENT'
  | 'INVITATION_ACCEPTED';

export interface LogActivityParams {
  userId: string;
  userEmail: string;
  activityType: ActivityType;
  description?: string;
  companyId?: string;
  companyName?: string;
  metadata?: Record<string, any>;
}

class ActivityLogger {
  private getUserIP(): string | null {
    // In a browser environment, we can't get the real IP
    // This would be better handled server-side
    return null;
  }

  private getUserAgent(): string {
    return navigator.userAgent;
  }

  async logActivity({
    userId,
    userEmail,
    activityType,
    description,
    companyId,
    companyName,
    metadata = {}
  }: LogActivityParams): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_user_email: userEmail,
        p_company_id: companyId || null,
        p_company_name: companyName || null,
        p_activity_type: activityType,
        p_activity_description: description || null,
        p_ip_address: this.getUserIP(),
        p_user_agent: this.getUserAgent(),
        p_metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer || null
        }
      });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw error to avoid disrupting user experience
    }
  }

  // Convenience methods for common activities
  async logLogin(userId: string, userEmail: string, userRole: string, companyId?: string, companyName?: string): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'LOGIN',
      description: `User logged in with ${userRole} role`,
      companyId,
      companyName,
      metadata: { userRole, loginMethod: 'password' }
    });
  }

  async logLogout(userId: string, userEmail: string): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'LOGOUT',
      description: 'User logged out'
    });
  }

  async logPageView(userId: string, userEmail: string, pageName: string, companyId?: string, companyName?: string): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'PAGE_VIEW',
      description: `Viewed ${pageName} page`,
      companyId,
      companyName,
      metadata: { page: pageName }
    });
  }

  async logAdminAction(userId: string, userEmail: string, action: string, details?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'ADMIN_ACTION',
      description: `Admin action: ${action}`,
      metadata: { action, ...details }
    });
  }

  async logCompanyAccess(userId: string, userEmail: string, companyId: string, companyName: string): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'COMPANY_ACCESS',
      description: `Accessed company portal: ${companyName}`,
      companyId,
      companyName
    });
  }

  async logPortalView(userId: string, userEmail: string, companyId: string, companyName: string, sections: string[]): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      activityType: 'PORTAL_VIEW',
      description: `Viewed portal content for ${companyName}`,
      companyId,
      companyName,
      metadata: { sectionsViewed: sections }
    });
  }
}

export const activityLogger = new ActivityLogger();