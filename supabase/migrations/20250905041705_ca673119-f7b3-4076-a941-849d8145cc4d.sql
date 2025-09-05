
-- 1) Ensure RLS is enabled on users table (should already be enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2) Remove risky policy that exposed user PII to any company member
DROP POLICY IF EXISTS "Users and admins can view users by ownership or shared company" ON public.users;

-- Note:
-- Admin can still SELECT due to existing "Admins can manage all users" (ALL) policy
-- Users can still view their own profile via "Users can view own profile data"

-- 3) Provide a safe roster function that avoids leaking emails.
--    This function returns minimal fields and enforces access via require_role().
--    It enables legitimate “who’s in my company” use-cases without exposing emails.
CREATE OR REPLACE FUNCTION public.get_company_members_minimal(p_company_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  member_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow only global Admin or members of the specified company
  IF NOT public.require_role(ARRAY['Admin','Member'], p_company_id) THEN
    -- Not authorized: return empty set
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      u.auth_user_id AS user_id,
      u.display_name,
      cm.role AS member_role
    FROM public.company_memberships cm
    JOIN public.users u
      ON u.auth_user_id = cm.user_id
    WHERE cm.company_id = p_company_id;
END;
$function$;

-- Explicitly grant to authenticated users (PUBLIC has EXECUTE by default, but we make it clear)
GRANT EXECUTE ON FUNCTION public.get_company_members_minimal(uuid) TO authenticated;
