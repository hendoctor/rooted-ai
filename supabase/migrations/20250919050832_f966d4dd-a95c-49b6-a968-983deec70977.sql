-- Create a function to create notifications when content is assigned to companies
CREATE OR REPLACE FUNCTION public.create_content_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_title text;
  content_type text;
  users_cursor CURSOR FOR 
    SELECT DISTINCT cm.user_id, u.email
    FROM company_memberships cm
    JOIN users u ON u.auth_user_id = cm.user_id
    WHERE cm.company_id = NEW.company_id;
  user_record RECORD;
BEGIN
  -- Determine content type and get title based on table
  IF TG_TABLE_NAME = 'announcement_companies' THEN
    SELECT title INTO content_title FROM announcements WHERE id = NEW.announcement_id;
    content_type := 'announcement';
  ELSIF TG_TABLE_NAME = 'portal_resource_companies' THEN
    SELECT title INTO content_title FROM portal_resources WHERE id = NEW.resource_id;
    content_type := 'resource';
  ELSIF TG_TABLE_NAME = 'useful_link_companies' THEN
    SELECT title INTO content_title FROM useful_links WHERE id = NEW.link_id;
    content_type := 'useful_link';
  ELSIF TG_TABLE_NAME = 'ai_tool_companies' THEN
    SELECT ai_tool INTO content_title FROM ai_tools WHERE id = NEW.ai_tool_id;
    content_type := 'ai_tool';
  ELSIF TG_TABLE_NAME = 'faq_companies' THEN
    SELECT question INTO content_title FROM faqs WHERE id = NEW.faq_id;
    content_type := 'faq';
  ELSIF TG_TABLE_NAME = 'adoption_coaching_companies' THEN
    SELECT topic INTO content_title FROM adoption_coaching WHERE id = NEW.coaching_id;
    content_type := 'coaching';
  ELSIF TG_TABLE_NAME = 'report_companies' THEN
    SELECT name INTO content_title FROM reports WHERE id = NEW.report_id;
    content_type := 'kpi';
  ELSE
    RETURN NEW; -- Unknown table, skip notification
  END IF;

  -- Only create notifications if we have content title
  IF content_title IS NOT NULL THEN
    -- Create notifications for all users in the company
    FOR user_record IN users_cursor LOOP
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
        CASE 
          WHEN TG_TABLE_NAME = 'announcement_companies' THEN NEW.announcement_id
          WHEN TG_TABLE_NAME = 'portal_resource_companies' THEN NEW.resource_id
          WHEN TG_TABLE_NAME = 'useful_link_companies' THEN NEW.link_id
          WHEN TG_TABLE_NAME = 'ai_tool_companies' THEN NEW.ai_tool_id
          WHEN TG_TABLE_NAME = 'faq_companies' THEN NEW.faq_id
          WHEN TG_TABLE_NAME = 'adoption_coaching_companies' THEN NEW.coaching_id
          WHEN TG_TABLE_NAME = 'report_companies' THEN NEW.report_id
        END,
        'medium'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create triggers for all content assignment tables
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