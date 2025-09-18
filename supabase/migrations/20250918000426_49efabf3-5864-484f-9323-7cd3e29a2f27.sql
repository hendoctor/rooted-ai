-- Security Hardening: Fix RLS Policies to Address Critical Vulnerabilities
-- This migration addresses security scan findings and implements defense-in-depth RLS policies

-- 1. USERS TABLE SECURITY: Add explicit deny policies for unauthorized access
-- Drop existing potentially permissive policies and recreate with stricter controls
DROP POLICY IF EXISTS "Users can view own profile data" ON public.users;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.users;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create restrictive policies for users table
CREATE POLICY "Deny anonymous access to users" 
ON public.users 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Users can only view own profile" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can only update own basic info" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id AND OLD.role = NEW.role); -- Prevent role self-elevation

CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 2. CONTACT SUBMISSIONS SECURITY: Strengthen access controls
DROP POLICY IF EXISTS "Only admins can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Public can submit contact forms" ON public.contact_submissions;

-- Recreate with explicit denies
CREATE POLICY "Deny authenticated non-admin access to contact submissions" 
ON public.contact_submissions 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Deny anonymous read access to contact submissions" 
ON public.contact_submissions 
FOR SELECT 
TO anon 
USING (false);

CREATE POLICY "Public can submit contact forms only" 
ON public.contact_submissions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Only admins can view contact submissions" 
ON public.contact_submissions 
FOR SELECT 
TO authenticated 
USING (is_admin());

-- 3. USER INVITATIONS SECURITY: Tighten invitation access policies
DROP POLICY IF EXISTS "Authenticated users can view invitations with valid token" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their own valid invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;

-- Strict invitation policies
CREATE POLICY "Deny anonymous access to invitations" 
ON public.user_invitations 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Users can only view their own valid invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated 
USING (
  lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')) 
  AND status = 'pending' 
  AND expires_at > now()
);

CREATE POLICY "Users can only accept their own invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated 
USING (
  lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')) 
  AND status = 'pending' 
  AND expires_at > now()
)
WITH CHECK (
  lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')) 
  AND status = 'accepted'
);

CREATE POLICY "Admins can manage all invitations" 
ON public.user_invitations 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 4. NEWSLETTER SUBSCRIPTIONS SECURITY: Restrict access appropriately
DROP POLICY IF EXISTS "Users can manage own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Company admins can manage member subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Global admins can manage all subscriptions" ON public.newsletter_subscriptions;

-- Secure newsletter policies
CREATE POLICY "Deny anonymous access to newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Users can only manage own newsletter subscription" 
ON public.newsletter_subscriptions 
FOR ALL 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR (user_id IS NULL AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')))
)
WITH CHECK (
  user_id = auth.uid() 
  OR (user_id IS NULL AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')))
);

CREATE POLICY "Company admins can manage company member subscriptions only" 
ON public.newsletter_subscriptions 
FOR ALL 
TO authenticated 
USING (
  company_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = newsletter_subscriptions.company_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'Admin'
  )
)
WITH CHECK (
  company_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = newsletter_subscriptions.company_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'Admin'
  )
);

CREATE POLICY "Global admins can manage all newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 5. ACTIVITY LOGS SECURITY: Strengthen access controls
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System and admins can log activities" ON public.activity_logs;

-- Secure activity log policies
CREATE POLICY "Deny anonymous access to activity logs" 
ON public.activity_logs 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny non-admin authenticated access to activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only admins can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only system and admins can log activities" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  current_setting('role') = 'service_role' 
  OR is_admin()
);

-- 6. SECURITY AUDIT LOG: Ensure only admins can access
DROP POLICY IF EXISTS "Admins can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can log security events" ON public.security_audit_log;

CREATE POLICY "Deny anonymous access to security audit log" 
ON public.security_audit_log 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Only admins can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only system can log security events" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (current_setting('role') = 'service_role');

-- 7. Log this security hardening event
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  created_at
) VALUES (
  'security_hardening_migration',
  jsonb_build_object(
    'migration_type', 'rls_policy_hardening',
    'tables_updated', ARRAY['users', 'contact_submissions', 'user_invitations', 'newsletter_subscriptions', 'activity_logs', 'security_audit_log'],
    'security_fixes', ARRAY[
      'Added explicit deny policies for anonymous access',
      'Strengthened user data access controls',
      'Restricted contact submission access to admins only',
      'Tightened invitation access policies',
      'Limited newsletter subscription access by company membership',
      'Secured activity logs for admin-only access'
    ]
  ),
  now()
);