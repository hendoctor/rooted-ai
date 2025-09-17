-- Restore missing helper functions and RPC functions to fix portal content loading

-- 1. Restore user_is_company_member helper function
CREATE OR REPLACE FUNCTION public.user_is_company_member(company_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_global_role TEXT;
BEGIN
  -- Get user's global role
  SELECT role INTO user_global_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Admin has access to everything
  IF user_global_role = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is member of the company
  RETURN EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid() 
    AND cm.company_id = company_id_param
  );
END;
$function$;

-- 2. Restore get_company_members_detailed RPC function
CREATE OR REPLACE FUNCTION public.get_company_members_detailed(company_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  role text,
  email text,
  joined_at timestamp with time zone,
  newsletter_status text,
  newsletter_frequency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if user has access to this company
  IF NOT user_is_company_member(company_id_param) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    cm.user_id,
    COALESCE(u.display_name, u.email) as display_name,
    cm.role,
    u.email,
    cm.created_at as joined_at,
    COALESCE(ns.status, 'not_subscribed') as newsletter_status,
    COALESCE(ns.frequency, '') as newsletter_frequency
  FROM company_memberships cm
  JOIN users u ON u.auth_user_id = cm.user_id
  LEFT JOIN newsletter_subscriptions ns ON ns.user_id = cm.user_id
  WHERE cm.company_id = company_id_param
  ORDER BY cm.created_at DESC;
END;
$function$;

-- 3. Grant EXECUTE permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_members_detailed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_portal_content(uuid) TO authenticated;