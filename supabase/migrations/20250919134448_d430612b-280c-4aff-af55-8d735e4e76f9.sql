-- Create a test trigger to simulate the real trigger behavior
CREATE OR REPLACE FUNCTION test_notification_creation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  test_company_id uuid := 'c63c1d68-99c8-4df5-a6ef-6a4c92497bad';
  test_link_id uuid := '0aa3a018-f912-4779-a4bc-dca820c0f957';
  content_title TEXT;
  content_url TEXT;
  notification_message TEXT;
BEGIN
  -- Get the link details
  SELECT title, url INTO content_title, content_url 
  FROM useful_links 
  WHERE id = test_link_id;
  
  RAISE NOTICE 'Found link: title=%, url=%', content_title, content_url;
  
  -- Create notification message
  notification_message := 'New useful_link "' || content_title || '" has been added to your portal.';
  
  RAISE NOTICE 'Creating notifications for company: %', test_company_id;
  
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
    test_company_id,
    'New Useful_link',
    notification_message,
    'useful_link',
    test_link_id,
    'medium',
    now()
  FROM company_memberships cm
  WHERE cm.company_id = test_company_id;
  
  RAISE NOTICE 'Notifications should be created';
END;
$$;

-- Run the test
SELECT test_notification_creation();