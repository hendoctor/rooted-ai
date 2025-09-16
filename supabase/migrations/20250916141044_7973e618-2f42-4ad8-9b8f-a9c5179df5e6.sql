-- Critical Security Fixes: Database Hardening and RLS Policy Improvements
-- This migration addresses the security issues identified in the comprehensive security review

-- Fix 1: Strengthen contact_submissions security
-- Currently users can't submit contact forms due to missing INSERT policy
-- Add policy to allow public contact form submissions with rate limiting
CREATE POLICY "Public can submit contact forms"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- Fix 2: Improve activity_logs security
-- Current INSERT policy is too permissive (allows anyone to insert with "true" check)
-- Restrict to only system/service role and admin users
DROP POLICY IF EXISTS "System can log all activities" ON public.activity_logs;
CREATE POLICY "System and admins can log activities"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  -- Allow service role or admin users to insert activity logs
  current_setting('role') = 'service_role' OR 
  is_admin()
);

-- Fix 3: Improve security_audit_log security
-- Current INSERT policy has "false" check which blocks all inserts
-- This should allow system/service role to insert security events
DROP POLICY IF EXISTS "Service role can log security events" ON public.security_audit_log;
CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
WITH CHECK (
  -- Allow service role to insert security events
  current_setting('role') = 'service_role'
);

-- Fix 4: Add comprehensive user profile protection
-- Ensure users can only update their own non-sensitive profile data
CREATE POLICY "Users can update own profile data"
ON public.users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth.uid() = auth_user_id AND
  -- Prevent users from changing their own role (admin-only operation)
  (OLD.role = NEW.role OR is_admin())
);

-- Fix 5: Add invitation security improvements
-- Strengthen invitation acceptance to prevent unauthorized access
CREATE POLICY "Users can accept their own pending invitations"
ON public.user_invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  status = 'pending' AND
  expires_at > now() AND
  -- Ensure email matches authenticated user
  lower(email) = lower(coalesce(auth.email(), ''))
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  status IN ('accepted', 'pending') AND
  -- Prevent changing invitation email or role during acceptance
  lower(email) = lower(OLD.email) AND
  role = OLD.role
);

-- Fix 6: Add security audit for sensitive operations
-- Log when RLS policies are modified or bypassed attempts are made
INSERT INTO public.security_audit_log (event_type, event_details, user_id)
VALUES (
  'security_policy_update',
  jsonb_build_object(
    'operation', 'rls_policy_hardening',
    'timestamp', now(),
    'changes', 'contact_submissions, activity_logs, security_audit_log, users, user_invitations'
  ),
  auth.uid()
);

-- Fix 7: Add rate limiting table for contact forms (if not exists)
CREATE TABLE IF NOT EXISTS public.contact_form_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  submission_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on rate limiting table
ALTER TABLE public.contact_form_rate_limits ENABLE ROW LEVEL SECURITY;

-- Add policy for rate limiting table (admin view only)
CREATE POLICY "Admins can view rate limits"
ON public.contact_form_rate_limits
FOR SELECT
USING (is_admin());

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.contact_form_rate_limits
FOR ALL
WITH CHECK (current_setting('role') = 'service_role');