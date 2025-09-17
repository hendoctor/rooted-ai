-- Create function to get detailed newsletter data for company admins
CREATE OR REPLACE FUNCTION public.get_company_newsletter_details(p_company_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  newsletter_status text,
  newsletter_frequency text,
  is_subscribed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin of the company or global admin
  IF NOT is_admin() AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = p_company_id 
    AND cm.user_id = auth.uid()
    AND cm.role = 'Admin'
  ) THEN
    -- Return empty results for unauthorized access
    RETURN;
  END IF;

  RETURN QUERY
  WITH company_members AS (
    SELECT DISTINCT 
      cm.user_id, 
      u.email,
      COALESCE(u.display_name, u.email) as display_name
    FROM company_memberships cm
    JOIN users u ON u.auth_user_id = cm.user_id
    WHERE cm.company_id = p_company_id
  )
  SELECT 
    cm.user_id,
    cm.email,
    cm.display_name,
    COALESCE(ns.status, 'not_subscribed') as newsletter_status,
    COALESCE(ns.frequency, 'weekly') as newsletter_frequency,
    CASE WHEN ns.status = 'active' THEN true ELSE false END as is_subscribed
  FROM company_members cm
  LEFT JOIN newsletter_subscriptions ns ON ns.user_id = cm.user_id OR ns.email = cm.email
  ORDER BY cm.display_name, cm.email;
END;
$function$;