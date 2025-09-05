-- Security Fix Phase 1: Fix Critical Database Access Controls

-- Enable RLS on policy_access_metrics table (currently has no RLS policies)
ALTER TABLE public.policy_access_metrics ENABLE ROW LEVEL SECURITY;

-- Create admin-only access policy for policy_access_metrics
CREATE POLICY "Admins can view policy access metrics" 
  ON public.policy_access_metrics 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can manage policy access metrics" 
  ON public.policy_access_metrics 
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- Security Fix Phase 2: Strengthen User Invitation Security

-- Drop the existing overly permissive invitation policy
DROP POLICY IF EXISTS "Invited user can view own invitations" ON public.user_invitations;

-- Create a more secure policy that requires proper authentication AND exact token match
-- This prevents email enumeration attacks
CREATE POLICY "Authenticated users can view invitations with valid token" 
  ON public.user_invitations 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status = 'pending'
    AND expires_at > now()
  );

-- Add a more restrictive policy for invitation updates (acceptance)
CREATE POLICY "Users can accept their own valid invitations" 
  ON public.user_invitations 
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status IN ('accepted', 'pending')
  );

-- Security Fix Phase 4: Enhanced Contact Form Protection

-- Add honeypot tracking table for spam detection
CREATE TABLE IF NOT EXISTS public.contact_form_honeypots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent TEXT,
  honeypot_field TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on honeypot table
ALTER TABLE public.contact_form_honeypots ENABLE ROW LEVEL SECURITY;

-- Only admins can view honeypot data
CREATE POLICY "Admins can view honeypot data" 
  ON public.contact_form_honeypots 
  FOR SELECT 
  USING (is_admin());

-- System can insert honeypot violations
CREATE POLICY "System can log honeypot violations" 
  ON public.contact_form_honeypots 
  FOR INSERT 
  WITH CHECK (true);

-- Add request fingerprinting table for enhanced spam detection
CREATE TABLE IF NOT EXISTS public.contact_form_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent_hash TEXT,
  screen_resolution TEXT,
  timezone_offset INTEGER,
  language TEXT,
  fingerprint_hash TEXT NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_suspicious BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on fingerprints table
ALTER TABLE public.contact_form_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only admins can view fingerprint data
CREATE POLICY "Admins can view fingerprint data" 
  ON public.contact_form_fingerprints 
  FOR SELECT 
  USING (is_admin());

-- System can manage fingerprint data
CREATE POLICY "System can manage fingerprint data" 
  ON public.contact_form_fingerprints 
  FOR ALL 
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_honeypots_ip_timestamp ON public.contact_form_honeypots(ip_address, timestamp);
CREATE INDEX IF NOT EXISTS idx_contact_fingerprints_hash ON public.contact_form_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_contact_fingerprints_ip ON public.contact_form_fingerprints(ip_address);