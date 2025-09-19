-- Fix the trigger function to work properly with RLS
CREATE OR REPLACE FUNCTION public.create_unified_content_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  content_title TEXT;
  content_url TEXT;
  notification_message TEXT;
  content_type TEXT;
BEGIN
  -- Determine content type and fetch content details based on table
  IF TG_TABLE_NAME = 'announcement_companies' THEN
    content_type := 'announcement';
    SELECT title, url INTO content_title, content_url 
    FROM announcements 
    WHERE id = NEW.announcement_id;
    notification_message := 'New announcement "' || COALESCE(content_title, 'Unknown') || '" has been added to your portal.';
    
  ELSIF TG_TABLE_NAME = 'portal_resource_companies' THEN
    content_type := 'resource';
    SELECT title, link INTO content_title, content_url 
    FROM portal_resources 
    WHERE id = NEW.resource_id;
    notification_message := 'New resource "' || COALESCE(content_title, 'Unknown') || '" has been added to your portal.';
    
  ELSIF TG_TABLE_NAME = 'useful_link_companies' THEN
    content_type := 'useful_link';
    SELECT title, url INTO content_title, content_url 
    FROM useful_links 
    WHERE id = NEW.link_id;
    notification_message := 'New useful link "' || COALESCE(content_title, 'Unknown') || '" has been added to your portal.';
    
  ELSIF TG_TABLE_NAME = 'ai_tool_companies' THEN
    content_type := 'ai_tool';
    SELECT ai_tool, url INTO content_title, content_url 
    FROM ai_tools 
    WHERE id = NEW.ai_tool_id;
    notification_message := 'New AI tool "' || COALESCE(content_title, 'Unknown') || '" has been added to your portal.';
    
  ELSIF TG_TABLE_NAME = 'faq_companies' THEN
    content_type := 'faq';
    SELECT question, NULL INTO content_title, content_url 
    FROM faqs 
    WHERE id = NEW.faq_id;
    notification_message := 'New FAQ "' || COALESCE(content_title, 'Unknown') || '" has been added to your portal.';
    
  ELSIF TG_TABLE_NAME = 'adoption_coaching_companies' THEN
    content_type := 'coaching';
    SELECT topic, meeting_link INTO content_title, content_url 
    FROM adoption_coaching 
    WHERE id = NEW.coaching_id;
    notification_message := 'New coaching session "' || COALESCE(content_title, 'Unknown') || '" has been scheduled.';
    
  ELSIF TG_TABLE_NAME = 'report_companies' THEN
    content_type := 'kpi';
    SELECT name, link INTO content_title, content_url 
    FROM reports 
    WHERE id = NEW.report_id;
    notification_message := 'New report "' || COALESCE(content_title, 'Unknown') || '" is available.';
    
  ELSE
    RETURN NEW; -- Unknown table, skip notification
  END IF;
  
  -- Create notifications for all company members using elevated privileges
  -- This bypasses RLS since we're in a SECURITY DEFINER function
  INSERT INTO notifications (
    user_id, 
    company_id, 
    title, 
    message, 
    notification_type, 
    reference_id,
    priority,
    created_at,
    updated_at
  )
  SELECT 
    cm.user_id,
    NEW.company_id,
    'New ' || INITCAP(REPLACE(content_type, '_', ' ')),
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
    now(),
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
        'error', SQLERRM,
        'content_type', content_type,
        'content_title', content_title
      ),
      NULL, -- No user context in trigger
      'medium'
    );
    RETURN NEW;
END;
$$;