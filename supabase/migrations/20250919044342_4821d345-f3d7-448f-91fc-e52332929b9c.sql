-- Create notifications table with proper structure
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('announcement', 'resource', 'ai_tool', 'useful_link', 'faq', 'coaching', 'kpi')),
  reference_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Function to get user notifications with content details
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid DEFAULT auth.uid(), p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  title text,
  message text,
  notification_type text,
  reference_id uuid,
  is_read boolean,
  priority text,
  created_at timestamp with time zone,
  read_at timestamp with time zone,
  content_title text,
  content_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.message,
    n.notification_type,
    n.reference_id,
    n.is_read,
    n.priority,
    n.created_at,
    n.read_at,
    CASE 
      WHEN n.notification_type = 'announcement' THEN a.title
      WHEN n.notification_type = 'resource' THEN pr.title
      WHEN n.notification_type = 'ai_tool' THEN at.ai_tool
      WHEN n.notification_type = 'useful_link' THEN ul.title
      WHEN n.notification_type = 'faq' THEN f.question
      WHEN n.notification_type = 'coaching' THEN ac.topic
      WHEN n.notification_type = 'kpi' THEN r.name
    END as content_title,
    CASE 
      WHEN n.notification_type = 'announcement' THEN a.url
      WHEN n.notification_type = 'resource' THEN pr.link
      WHEN n.notification_type = 'ai_tool' THEN at.url
      WHEN n.notification_type = 'useful_link' THEN ul.url
      WHEN n.notification_type = 'coaching' THEN ac.meeting_link
      WHEN n.notification_type = 'kpi' THEN r.link
    END as content_url
  FROM notifications n
  LEFT JOIN announcements a ON n.notification_type = 'announcement' AND n.reference_id = a.id
  LEFT JOIN portal_resources pr ON n.notification_type = 'resource' AND n.reference_id = pr.id
  LEFT JOIN ai_tools at ON n.notification_type = 'ai_tool' AND n.reference_id = at.id
  LEFT JOIN useful_links ul ON n.notification_type = 'useful_link' AND n.reference_id = ul.id
  LEFT JOIN faqs f ON n.notification_type = 'faq' AND n.reference_id = f.id
  LEFT JOIN adoption_coaching ac ON n.notification_type = 'coaching' AND n.reference_id = ac.id
  LEFT JOIN reports r ON n.notification_type = 'kpi' AND n.reference_id = r.id
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(p_notification_ids uuid[] DEFAULT NULL, p_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE notifications 
    SET is_read = true, read_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications 
    SET is_read = true, read_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  END IF;
END;
$$;

-- Function to create notification when content is assigned to companies
CREATE OR REPLACE FUNCTION public.create_content_notification(
  p_content_type text,
  p_content_id uuid,
  p_company_ids uuid[],
  p_title text,
  p_message text DEFAULT NULL,
  p_priority text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id uuid;
  user_record record;
BEGIN
  -- Loop through each company
  FOREACH company_id IN ARRAY p_company_ids
  LOOP
    -- Get all users in this company
    FOR user_record IN 
      SELECT DISTINCT cm.user_id, u.email
      FROM company_memberships cm
      JOIN users u ON u.auth_user_id = cm.user_id
      WHERE cm.company_id = company_id
    LOOP
      -- Create notification for each user
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
        company_id,
        p_title,
        COALESCE(p_message, 'New ' || p_content_type || ' has been assigned to your company'),
        p_content_type,
        p_content_id,
        p_priority
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger function for automatic notification creation
CREATE OR REPLACE FUNCTION public.trigger_create_content_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_title text;
  content_type text;
  content_id uuid;
  company_ids uuid[];
BEGIN
  -- Determine content type and details based on table
  CASE TG_TABLE_NAME
    WHEN 'announcement_companies' THEN
      content_type := 'announcement';
      content_id := NEW.announcement_id;
      SELECT title INTO content_title FROM announcements WHERE id = NEW.announcement_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'portal_resource_companies' THEN
      content_type := 'resource';
      content_id := NEW.resource_id;
      SELECT title INTO content_title FROM portal_resources WHERE id = NEW.resource_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'ai_tool_companies' THEN
      content_type := 'ai_tool';
      content_id := NEW.ai_tool_id;
      SELECT ai_tool INTO content_title FROM ai_tools WHERE id = NEW.ai_tool_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'useful_link_companies' THEN
      content_type := 'useful_link';
      content_id := NEW.link_id;
      SELECT title INTO content_title FROM useful_links WHERE id = NEW.link_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'faq_companies' THEN
      content_type := 'faq';
      content_id := NEW.faq_id;
      SELECT question INTO content_title FROM faqs WHERE id = NEW.faq_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'adoption_coaching_companies' THEN
      content_type := 'coaching';
      content_id := NEW.coaching_id;
      SELECT topic INTO content_title FROM adoption_coaching WHERE id = NEW.coaching_id;
      company_ids := ARRAY[NEW.company_id];
      
    WHEN 'report_companies' THEN
      content_type := 'kpi';
      content_id := NEW.report_id;
      SELECT name INTO content_title FROM reports WHERE id = NEW.report_id;
      company_ids := ARRAY[NEW.company_id];
  END CASE;
  
  -- Create notifications
  IF content_title IS NOT NULL THEN
    PERFORM create_content_notification(
      content_type,
      content_id,
      company_ids,
      'New ' || INITCAP(replace(content_type, '_', ' ')) || ': ' || content_title,
      'A new ' || replace(content_type, '_', ' ') || ' has been assigned to your company.',
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for automatic notification creation
CREATE TRIGGER trigger_announcement_notifications
  AFTER INSERT ON announcement_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_resource_notifications
  AFTER INSERT ON portal_resource_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_ai_tool_notifications
  AFTER INSERT ON ai_tool_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_useful_link_notifications
  AFTER INSERT ON useful_link_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_faq_notifications
  AFTER INSERT ON faq_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_coaching_notifications
  AFTER INSERT ON adoption_coaching_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

CREATE TRIGGER trigger_report_notifications
  AFTER INSERT ON report_companies
  FOR EACH ROW EXECUTE FUNCTION trigger_create_content_notifications();

-- Update updated_at trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;