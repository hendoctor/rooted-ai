import { supabase } from '@/integrations/supabase/client';

export interface CreateNotificationParams {
  title: string;
  message: string;
  notificationType: 'announcement' | 'resource' | 'ai_tool' | 'useful_link' | 'faq' | 'coaching' | 'kpi';
  referenceId: string;
  companyIds: string[];
  priority?: 'low' | 'medium' | 'high';
}

export const createNotificationsForCompanies = async ({
  title,
  message,
  notificationType,
  referenceId,
  companyIds,
  priority = 'medium'
}: CreateNotificationParams) => {
  if (!companyIds || companyIds.length === 0) {
    console.log('No companies to notify');
    return;
  }

  try {
    // Get all users from the specified companies
    const { data: companyMembers, error: membersError } = await supabase
      .from('company_memberships')
      .select('user_id, company_id')
      .in('company_id', companyIds);

    if (membersError) {
      console.error('Error fetching company members:', membersError);
      return;
    }

    if (!companyMembers || companyMembers.length === 0) {
      console.log('No company members found');
      return;
    }

    // Create notifications for each user
    const notifications = companyMembers.map(member => ({
      user_id: member.user_id,
      company_id: member.company_id,
      title,
      message,
      notification_type: notificationType,
      reference_id: referenceId,
      priority,
      is_read: false
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw notificationError;
    }

    console.log(`Created ${notifications.length} notifications for ${notificationType}`);
  } catch (error) {
    console.error('Failed to create notifications:', error);
    throw error;
  }
};

// Notification message generators
export const getNotificationMessage = (type: string, title: string, isNew: boolean): { title: string; message: string } => {
  const action = isNew ? 'added' : 'updated';
  
  switch (type) {
    case 'announcement':
      return {
        title: `New Announcement: ${title}`,
        message: `A new announcement "${title}" has been ${action} to your portal.`
      };
    case 'resource':
      return {
        title: `New Resource: ${title}`,
        message: `A new resource "${title}" has been ${action} to your portal.`
      };
    case 'ai_tool':
      return {
        title: `New AI Tool: ${title}`,
        message: `A new AI tool "${title}" has been ${action} to your portal.`
      };
    case 'useful_link':
      return {
        title: `New Link: ${title}`,
        message: `A new useful link "${title}" has been ${action} to your portal.`
      };
    case 'faq':
      return {
        title: `New FAQ: ${title}`,
        message: `A new FAQ "${title}" has been ${action} to your portal.`
      };
    case 'coaching':
      return {
        title: `New Coaching Session: ${title}`,
        message: `A new coaching session "${title}" has been ${action} to your portal.`
      };
    case 'kpi':
      return {
        title: `New Report: ${title}`,
        message: `A new report "${title}" has been ${action} to your portal.`
      };
    default:
      return {
        title: `New Content: ${title}`,
        message: `New content "${title}" has been ${action} to your portal.`
      };
  }
};