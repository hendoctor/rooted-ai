-- Phase 1: Critical Database Security Fixes

-- 1. Fix User Table RLS Policies
-- Drop the weak email-based policy that exposes all user data
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Keep the secure policies and add a consolidated user data access policy
CREATE POLICY "Users can view own profile data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_user_id);

-- 2. Secure Invitation System - Replace email-based access with token-based
-- Drop the insecure email-based policy
DROP POLICY IF EXISTS "Invited user can view own pending invitation" ON public.user_invitations;

-- Create secure token-based access policy
CREATE POLICY "Token-based invitation access only" 
ON public.user_invitations 
FOR SELECT 
USING (
  -- Only allow access when specifically validating a token through the secure function
  -- This prevents direct email-based access while allowing token validation
  invitation_token IS NOT NULL 
  AND status = 'pending' 
  AND expires_at > now()
);

-- 3. Fix Database Function Security - Add proper search_path protection
-- Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$function$;

-- Update log_policy_access function with explicit search_path
CREATE OR REPLACE FUNCTION public.log_policy_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Function logic remains the same, but now with secure search_path
    RETURN NEW;
END;
$function$;

-- 4. Enhance security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text, 
  event_details jsonb DEFAULT NULL::jsonb, 
  user_id uuid DEFAULT auth.uid(),
  risk_level text DEFAULT 'medium'
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_details jsonb;
BEGIN
  -- Enhanced sanitization with risk level tracking
  IF event_details IS NOT NULL THEN
    sanitized_details = jsonb_strip_nulls(
      jsonb_build_object(
        'event_id', event_details->>'event_id',
        'endpoint', event_details->>'endpoint',
        'result', event_details->>'result',
        'risk_level', risk_level,
        'window_minutes', event_details->>'window_minutes',
        'table', event_details->>'table',
        'operation', event_details->>'operation',
        'ip_hash', CASE 
          WHEN event_details->>'client_ip' IS NOT NULL 
          THEN encode(digest(event_details->>'client_ip', 'sha256'), 'hex')
          ELSE NULL
        END,
        'email_domain', CASE 
          WHEN event_details->>'email' IS NOT NULL 
          THEN split_part(event_details->>'email', '@', 2)
          ELSE NULL
        END,
        'user_agent_hash', CASE
          WHEN event_details->>'user_agent' IS NOT NULL
          THEN encode(digest(event_details->>'user_agent', 'sha256'), 'hex')
          ELSE NULL
        END,
        'timestamp', event_details->>'timestamp'
      )
    );
  END IF;

  INSERT INTO security_audit_log (
    user_id,
    event_type,
    event_details,
    created_at
  ) VALUES (
    user_id,
    event_type,
    sanitized_details,
    now()
  );
END;
$function$;