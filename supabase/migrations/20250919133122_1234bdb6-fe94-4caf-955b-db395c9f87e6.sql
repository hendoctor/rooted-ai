-- Fix duplicate notification triggers and column ambiguity issues
-- This addresses the "column reference 'company_id' is ambiguous" error

-- First, let's drop the duplicate/conflicting triggers on useful_link_companies
DROP TRIGGER IF EXISTS trigger_link_notifications ON useful_link_companies;
DROP TRIGGER IF EXISTS trigger_useful_link_notifications ON useful_link_companies;

-- Drop any other duplicate triggers on content assignment tables
DROP TRIGGER IF EXISTS trigger_announcement_notifications ON announcement_companies;
DROP TRIGGER IF EXISTS trigger_resource_notifications ON portal_resource_companies;
DROP TRIGGER IF EXISTS trigger_ai_tool_notifications ON ai_tool_companies;
DROP TRIGGER IF EXISTS trigger_faq_notifications ON faq_companies;
DROP TRIGGER IF EXISTS trigger_coaching_notifications ON adoption_coaching_companies;
DROP TRIGGER IF EXISTS trigger_report_notifications ON report_companies;

-- Create a unified notification function that handles all content types
CREATE OR REPLACE FUNCTION create_unified_content_notification()
RETURNS TRIGGER AS $$
DECLARE
  content_record RECORD;
  company_record RECORD;
  user_record RECORD;
  content_type TEXT;
  content_title TEXT;
  content_url TEXT;
  notification_message TEXT;
BEGIN
  -- Determine content type and fetch content details based on table
  IF TG_TABLE_NAME = 'announcement_companies' THEN
    content_type := 'announcement';
    SELECT title, url INTO content_title, content_url 
    FROM announcements 
    WHERE id = NEW.announcement_id;
    
  ELSIF TG_TABLE_NAME = 'portal_resource_companies' THEN
    content_type := 'resource';
    SELECT title, link INTO content_title, content_url 
    FROM portal_resources 
    WHERE id = NEW.resource_id;
    
  ELSIF TG_TABLE_NAME = 'useful_link_companies' THEN
    content_type := 'useful_link';
    SELECT title, url INTO content_title, content_url 
    FROM useful_links 
    WHERE id = NEW.link_id;
    
  ELSIF TG_TABLE_NAME = 'ai_tool_companies' THEN
    content_type := 'ai_tool';
    SELECT ai_tool, url INTO content_title, content_url 
    FROM ai_tools 
    WHERE id = NEW.ai_tool_id;
    
  ELSIF TG_TABLE_NAME = 'faq_companies' THEN
    content_type := 'faq';
    SELECT question, NULL INTO content_title, content_url 
    FROM faqs 
    WHERE id = NEW.faq_id;
    
  ELSIF TG_TABLE_NAME = 'adoption_coaching_companies' THEN
    content_type := 'coaching';
    SELECT topic, meeting_link INTO content_title, content_url 
    FROM adoption_coaching 
    WHERE id = NEW.coaching_id;
    
  ELSIF TG_TABLE_NAME = 'report_companies' THEN
    content_type := 'kpi';
    SELECT name, link INTO content_title, content_url 
    FROM reports 
    WHERE id = NEW.report_id;
    
  ELSE
    RETURN NEW; -- Unknown table, skip notification
  END IF;
  
  -- Get company name
  SELECT name INTO company_record
  FROM companies 
  WHERE id = NEW.company_id;
  
  -- Create notification message
  notification_message := 'New ' || content_type || ' available: ' || content_title;
  
  -- Create notifications for all company members
  INSERT INTO notifications (
    user_id, 
    company_id, 
    title, 
    message, 
    notification_type, 
    reference_id,
    priority,
    created_at
  )
  SELECT 
    cm.user_id,
    NEW.company_id,
    'New ' || INITCAP(content_type) || ' Available',
    notification_message,
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
    'medium',
    now()
  FROM company_memberships cm
  WHERE cm.company_id = NEW.company_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent the content assignment
    PERFORM log_security_event_enhanced(
      'notification_creation_error',
      jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'company_id', NEW.company_id,
        'error', SQLERRM
      ),
      auth.uid(),
      'medium'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create unified triggers for all content assignment tables
CREATE TRIGGER trigger_unified_announcement_notifications
  AFTER INSERT ON announcement_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_resource_notifications
  AFTER INSERT ON portal_resource_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_link_notifications
  AFTER INSERT ON useful_link_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_ai_tool_notifications
  AFTER INSERT ON ai_tool_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_faq_notifications
  AFTER INSERT ON faq_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_coaching_notifications
  AFTER INSERT ON adoption_coaching_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();

CREATE TRIGGER trigger_unified_report_notifications
  AFTER INSERT ON report_companies
  FOR EACH ROW EXECUTE FUNCTION create_unified_content_notification();