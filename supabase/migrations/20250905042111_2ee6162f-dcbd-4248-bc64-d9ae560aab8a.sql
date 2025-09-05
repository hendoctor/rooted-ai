-- Security hardening migration (idempotent)

-- 1) Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2) Remove risky policy that could expose user PII
DROP POLICY IF EXISTS "Users and admins can view users by ownership or shared company" ON public.users;

-- 3) Safe company roster function without exposing emails
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

-- Grant explicit execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_members_minimal(uuid) TO authenticated;

-- 4) Lock down public inserts: rely on Edge Functions (service role bypasses RLS)
-- Contact form: remove any public INSERT path
DROP POLICY IF EXISTS "Allow contact form submissions" ON public.contact_submissions;

-- Newsletter: remove any public INSERT path
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;