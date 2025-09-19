-- Fix the trigger function to handle errors gracefully and ensure column names are correct
DROP FUNCTION IF EXISTS public.create_content_notifications() CASCADE;

CREATE OR REPLACE FUNCTION public.create_content_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_title text;
  content_type text;
  reference_content_id uuid;
  users_cursor CURSOR FOR 
    SELECT DISTINCT cm.user_id, u.email
    FROM company_memberships cm
    JOIN users u ON u.auth_user_id = cm.user_id
    WHERE cm.company_id = NEW.company_id;
  user_record RECORD;
BEGIN
  -- Determine content type and get title based on table
  BEGIN
    IF TG_TABLE_NAME = 'announcement_companies' THEN
      SELECT title INTO content_title FROM announcements WHERE id = NEW.announcement_id;
      content_type := 'announcement';
      reference_content_id := NEW.announcement_id;
    ELSIF TG_TABLE_NAME = 'portal_resource_companies' THEN
      SELECT title INTO content_title FROM portal_resources WHERE id = NEW.resource_id;
      content_type := 'resource';
      reference_content_id := NEW.resource_id;
    ELSIF TG_TABLE_NAME = 'useful_link_companies' THEN
      SELECT title INTO content_title FROM useful_links WHERE id = NEW.link_id;
      content_type := 'useful_link';
      reference_content_id := NEW.link_id;
    ELSIF TG_TABLE_NAME = 'ai_tool_companies' THEN
      SELECT ai_tool INTO content_title FROM ai_tools WHERE id = NEW.ai_tool_id;
      content_type := 'ai_tool';
      reference_content_id := NEW.ai_tool_id;
    ELSIF TG_TABLE_NAME = 'faq_companies' THEN
      SELECT question INTO content_title FROM faqs WHERE id = NEW.faq_id;
      content_type := 'faq';
      reference_content_id := NEW.faq_id;
    ELSIF TG_TABLE_NAME = 'adoption_coaching_companies' THEN
      SELECT topic INTO content_title FROM adoption_coaching WHERE id = NEW.coaching_id;
      content_type := 'coaching';
      reference_content_id := NEW.coaching_id;
    ELSIF TG_TABLE_NAME = 'report_companies' THEN
      SELECT name INTO content_title FROM reports WHERE id = NEW.report_id;
      content_type := 'kpi';
      reference_content_id := NEW.report_id;
    ELSE
      RETURN NEW; -- Unknown table, skip notification
    END IF;

    -- Only create notifications if we have content title
    IF content_title IS NOT NULL AND reference_content_id IS NOT NULL THEN
      -- Create notifications for all users in the company
      FOR user_record IN users_cursor LOOP
        BEGIN
          INSERT INTO notifications (
            user_id,
            company_id,
            title,
            message,
            notification_type,
            reference_id,
            priority
          ) VALUES (
            user_record.user_id,
            NEW.company_id,
            'New ' || 
              CASE content_type
                WHEN 'announcement' THEN 'Announcement'
                WHEN 'resource' THEN 'Resource'
                WHEN 'useful_link' THEN 'Useful Link'
                WHEN 'ai_tool' THEN 'AI Tool'
                WHEN 'faq' THEN 'FAQ'
                WHEN 'coaching' THEN 'Coaching Session'
                WHEN 'kpi' THEN 'Report'
              END,
            'New ' || 
              CASE content_type
                WHEN 'announcement' THEN 'announcement'
                WHEN 'resource' THEN 'resource'
                WHEN 'useful_link' THEN 'useful link'
                WHEN 'ai_tool' THEN 'AI tool'
                WHEN 'faq' THEN 'FAQ'
                WHEN 'coaching' THEN 'coaching session'
                WHEN 'kpi' THEN 'report'
              END || 
            ' "' || content_title || '" has been added to your portal.',
            content_type,
            reference_content_id,
            'medium'
          );
        EXCEPTION
          WHEN OTHERS THEN
            -- Log the error but don't fail the transaction
            PERFORM log_security_event_enhanced(
              'notification_creation_error',
              jsonb_build_object(
                'table', TG_TABLE_NAME,
                'content_type', content_type,
                'content_id', reference_content_id,
                'user_id', user_record.user_id,
                'error', SQLERRM
              ),
              user_record.user_id,
              'medium'
            );
        END;
      END LOOP;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the main transaction
      PERFORM log_security_event_enhanced(
        'content_notification_trigger_error',
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'error', SQLERRM
        ),
        NULL,
        'medium'
      );
  END;

  RETURN NEW;
END;
$function$;

-- Recreate triggers for all content assignment tables
DROP TRIGGER IF EXISTS trigger_announcement_notifications ON announcement_companies;
CREATE TRIGGER trigger_announcement_notifications
  AFTER INSERT ON announcement_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_resource_notifications ON portal_resource_companies;
CREATE TRIGGER trigger_resource_notifications
  AFTER INSERT ON portal_resource_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_link_notifications ON useful_link_companies;
CREATE TRIGGER trigger_link_notifications
  AFTER INSERT ON useful_link_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_ai_tool_notifications ON ai_tool_companies;
CREATE TRIGGER trigger_ai_tool_notifications
  AFTER INSERT ON ai_tool_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_faq_notifications ON faq_companies;
CREATE TRIGGER trigger_faq_notifications
  AFTER INSERT ON faq_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_coaching_notifications ON adoption_coaching_companies;
CREATE TRIGGER trigger_coaching_notifications
  AFTER INSERT ON adoption_coaching_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

DROP TRIGGER IF EXISTS trigger_report_notifications ON report_companies;
CREATE TRIGGER trigger_report_notifications
  AFTER INSERT ON report_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_content_notifications();

-- Enable realtime for the notifications table
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE notifications;