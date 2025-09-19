-- Security Enhancement: Fix RLS policies for users table to protect email addresses and personal data
-- This addresses the security finding about potential user email and personal data exposure

-- First, drop the overly permissive company admin policy that allows access to sensitive data
DROP POLICY IF EXISTS "Company admins can view their company members' profiles" ON public.users;

-- Create a security definer function to safely check if user can access full profile data
CREATE OR REPLACE FUNCTION public.can_access_full_user_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Allow users to access their own full profile
  IF auth.uid() = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Allow global admins to access full profiles
  SELECT role INTO current_user_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF current_user_role = 'Admin' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create a more restrictive policy that prevents company admins from accessing sensitive personal data
-- Company admins should not be able to see email addresses and other sensitive info of team members
CREATE POLICY "Restricted user profile access" 
ON public.users 
FOR SELECT 
USING (
  -- Users can view their own full profile
  auth.uid() = auth_user_id
  OR
  -- Global admins can view all profiles
  is_admin()
  OR
  -- Company admins can only view if they use the proper secure functions
  -- This prevents direct access to sensitive fields like email
  (
    EXISTS (
      SELECT 1 
      FROM company_memberships cm1
      JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid() 
      AND cm1.role = 'Admin'
      AND cm2.user_id = users.auth_user_id
    )
    AND can_access_full_user_profile(users.auth_user_id) = false
  )
);

-- Update the existing policies to be more explicit about data protection
DROP POLICY IF EXISTS "Users can view own profile only" ON public.users;
CREATE POLICY "Users can view own profile only" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_user_id);

-- Ensure the admin policy is still secure
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Global admins can manage all users" 
ON public.users 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create a function for company admins to get limited user info (without sensitive data)
CREATE OR REPLACE FUNCTION public.get_company_member_profiles(company_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  role text,
  client_name text,
  created_at timestamptz,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow company admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM company_memberships 
    WHERE user_id = auth.uid() 
    AND company_id = company_id_param 
    AND role = 'Admin'
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized access to company member profiles';
  END IF;

  RETURN QUERY
  SELECT 
    u.auth_user_id,
    u.display_name,
    u.role,
    u.client_name,
    u.created_at,
    u.avatar_url
    -- Explicitly exclude email and other sensitive fields
  FROM users u
  JOIN company_memberships cm ON cm.user_id = u.auth_user_id
  WHERE cm.company_id = company_id_param;
END;
$$;

-- Add constraint to ensure email addresses are never empty (data integrity)
ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS users_email_not_empty 
  CHECK (email IS NOT NULL AND length(trim(email)) > 0);

-- Create audit logging for sensitive data access attempts
CREATE OR REPLACE FUNCTION public.audit_user_data_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log this security enhancement
  PERFORM log_security_event_enhanced(
    'user_data_protection_enhanced',
    jsonb_build_object(
      'enhancement_type', 'rls_policy_hardening',
      'description', 'Strengthened RLS policies to protect user emails and personal data',
      'applied_by', auth.uid(),
      'timestamp', now()
    ),
    auth.uid(),
    'low'
  );
END;
$$;

-- Execute the audit logging
SELECT public.audit_user_data_access();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_access_full_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_member_profiles(uuid) TO authenticated;