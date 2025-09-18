-- Create missing security functions that are critical for RLS policies

-- 1. Create is_admin() function (critical for all security policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's global role from users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Return true if user is Admin
  RETURN user_role = 'Admin';
EXCEPTION
  WHEN OTHERS THEN
    -- Return false on any error to fail secure
    RETURN FALSE;
END;
$function$;

-- 2. Ensure get_current_user_role function exists and works properly
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE(role, 'Client') FROM public.users WHERE auth_user_id = auth.uid();
$function$;

-- 3. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 4. Test the functions work by logging their creation
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  created_at
) VALUES (
  'security_functions_recreated',
  jsonb_build_object(
    'functions_created', ARRAY['is_admin', 'get_current_user_role'],
    'reason', 'Missing critical security functions for RLS policies'
  ),
  now()
);