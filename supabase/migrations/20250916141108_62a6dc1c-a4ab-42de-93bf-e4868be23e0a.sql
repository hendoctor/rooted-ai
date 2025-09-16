-- Critical Security Fixes: Database Hardening (Corrected)
-- This migration addresses the security issues with proper RLS syntax

-- Fix 1: Allow public contact form submissions
CREATE POLICY "Public can submit contact forms"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- Fix 2: Improve activity_logs security - restrict INSERT to system/admin only
DROP POLICY IF EXISTS "System can log all activities" ON public.activity_logs;
CREATE POLICY "System and admins can log activities"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  current_setting('role') = 'service_role' OR 
  is_admin()
);

-- Fix 3: Fix security_audit_log INSERT policy
DROP POLICY IF EXISTS "Service role can log security events" ON public.security_audit_log;
CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
WITH CHECK (current_setting('role') = 'service_role');

-- Fix 4: Add user profile update protection (simplified)
CREATE POLICY "Users can update own basic profile"
ON public.users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Fix 5: Add enhanced contact form rate limiting table
CREATE TABLE IF NOT EXISTS public.contact_form_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  submission_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_form_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limits"
ON public.contact_form_rate_limits
FOR SELECT
USING (is_admin());

CREATE POLICY "System can manage rate limits"
ON public.contact_form_rate_limits
FOR ALL
WITH CHECK (current_setting('role') = 'service_role');

-- Log the security update
INSERT INTO public.security_audit_log (event_type, event_details)
VALUES (
  'security_policy_hardening',
  jsonb_build_object(
    'operation', 'rls_policy_fixes',
    'timestamp', now(),
    'tables_updated', ARRAY['contact_submissions', 'activity_logs', 'security_audit_log', 'users']
  )
);