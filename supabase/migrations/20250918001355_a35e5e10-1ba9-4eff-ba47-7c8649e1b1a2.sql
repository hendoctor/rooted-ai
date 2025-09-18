-- Fix RLS Policies: Use positive access grants instead of deny policies
-- This approach is more secure and avoids policy conflicts

-- 1. USERS TABLE: Remove conflicting policies and use positive access only
DROP POLICY IF EXISTS "Deny anonymous access to users" ON public.users;
DROP POLICY IF EXISTS "Users can only view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can only update own basic info" ON public.users;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create clean positive-access policies for users
CREATE POLICY "Users can view own profile only" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own basic info only" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 2. CONTACT SUBMISSIONS: Clean positive-access policies
DROP POLICY IF EXISTS "Deny anonymous read access to contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Deny non-admin authenticated access to contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Public can submit contact forms only" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact forms" 
ON public.contact_submissions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Only admins can view contact submissions" 
ON public.contact_submissions 
FOR SELECT 
TO authenticated 
USING (is_admin());

-- 3. USER INVITATIONS: Clean positive-access policies
DROP POLICY IF EXISTS "Deny anonymous access to invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can only view their own valid invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can only accept their own invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.user_invitations;

CREATE POLICY "Users can view own valid invitations only" 
ON public.user_invitations 
FOR SELECT 
TO authenticated 
USING (
  lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '')) 
  AND status = 'pending' 
  AND expires_at > now()
);

CREATE POLICY "Users can update own invitations only" 
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
);

CREATE POLICY "Admins can manage all invitations" 
ON public.user_invitations 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 4. NEWSLETTER SUBSCRIPTIONS: Clean positive-access policies
DROP POLICY IF EXISTS "Deny anonymous access to newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can only manage own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Company admins can manage company member subscriptions only" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Global admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Users can manage own newsletter subscription" 
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

CREATE POLICY "Company admins can manage member subscriptions" 
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

CREATE POLICY "Global admins can manage all subscriptions" 
ON public.newsletter_subscriptions 
FOR ALL 
TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- 5. ACTIVITY LOGS: Clean positive-access policies
DROP POLICY IF EXISTS "Deny anonymous access to activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only system and admins can log activities" ON public.activity_logs;

CREATE POLICY "Only admins can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only system and admins can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  current_setting('role') = 'service_role' 
  OR is_admin()
);

-- 6. SECURITY AUDIT LOG: Clean positive-access policies
DROP POLICY IF EXISTS "Deny anonymous access to security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Only admins can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Only system can log security events" ON public.security_audit_log;

CREATE POLICY "Only admins can view security logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only system can insert security logs" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (current_setting('role') = 'service_role');

-- Log the policy restructuring
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  created_at
) VALUES (
  'rls_policies_restructured',
  jsonb_build_object(
    'action', 'replaced_deny_policies_with_positive_access',
    'reason', 'Improve security policy effectiveness and remove conflicts',
    'tables_updated', ARRAY['users', 'contact_submissions', 'user_invitations', 'newsletter_subscriptions', 'activity_logs', 'security_audit_log']
  ),
  now()
);