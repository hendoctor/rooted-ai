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

-- Update the existing policies to be more explicit about data protection
DROP POLICY IF EXISTS "Users can view own profile only" ON public.users;
CREATE POLICY "Users can view own profile only" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_user_id);

-- Ensure the admin policy is still secure and explicit
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Global admins can manage all users" 
ON public.users 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create a secure function for company admins to get limited user info (without sensitive data)
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

  -- Log the access attempt for audit purposes
  PERFORM log_security_event_enhanced(
    'company_member_profiles_accessed',
    jsonb_build_object(
      'company_id', company_id_param,
      'accessor_user_id', auth.uid(),
      'access_time', now()
    ),
    auth.uid(),
    'low'
  );

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

-- Add data integrity constraint for email addresses (using proper syntax)
DO $$
BEGIN
  -- Check if constraint already exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_not_empty' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_email_not_empty 
      CHECK (email IS NOT NULL AND length(trim(email)) > 0);
  END IF;
END $$;

-- Create audit logging for this security enhancement
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  created_at
) VALUES (
  'user_data_protection_enhanced',
  jsonb_build_object(
    'enhancement_type', 'rls_policy_hardening',
    'description', 'Removed overly permissive company admin policy that exposed user emails and personal data',
    'actions_taken', jsonb_build_array(
      'Dropped company admin profile viewing policy',
      'Created secure function for limited company member data access',
      'Added data integrity constraints for email field',
      'Enhanced audit logging for user data access'
    ),
    'security_level', 'enhanced',
    'timestamp', now()
  ),
  now()
);

-- Grant necessary permissions for the new secure functions
GRANT EXECUTE ON FUNCTION public.can_access_full_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_member_profiles(uuid) TO authenticated;