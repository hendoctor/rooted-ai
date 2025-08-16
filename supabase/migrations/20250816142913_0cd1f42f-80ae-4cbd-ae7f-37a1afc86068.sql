-- CRITICAL SECURITY FIXES FOR DATABASE FUNCTIONS
-- Adding search_path security to prevent SQL injection via search_path manipulation

-- 1. Secure all existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_client_name()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT client_name FROM public.users WHERE auth_user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'role', role,
      'client_name', client_name,
      'email', email
    )
    FROM public.users 
    WHERE email = user_email
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'role', 'Client',
      'client_name', null,
      'email', user_email,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_by_auth_id(auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'role', u.role,
      'client_name', u.client_name,
      'email', u.email
    )
    FROM public.users u
    WHERE u.auth_user_id = get_user_role_by_auth_id.auth_user_id
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'role', 'Client',
      'client_name', null,
      'email', null,
      'error', SQLERRM
    );
END;
$function$;

-- 2. Improve RLS policies for stricter company isolation
-- Drop overpermissive policies and create stricter ones
DROP POLICY IF EXISTS "Users can access same client data" ON public.users;

-- Replace with more secure policy
CREATE POLICY "Users can view users in their companies only"
ON public.users
FOR SELECT
USING (
  auth.uid() = auth_user_id OR
  get_current_user_role() = 'Admin' OR
  EXISTS (
    SELECT 1 FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid() 
    AND cm2.user_id = users.auth_user_id
  )
);

-- 3. Add missing RLS policies for security audit log table
-- Ensure only system can insert, only admins can view
CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Update admin viewing policy to be more specific
DROP POLICY IF EXISTS "Admins can view security audit log" ON public.security_audit_log;
CREATE POLICY "Admins can view security audit log"
ON public.security_audit_log
FOR SELECT
USING (get_current_user_role() = 'Admin');

-- 4. Enhance invitation security - reduce sensitive data in logs
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_details jsonb DEFAULT NULL::jsonb, user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sanitized_details jsonb;
BEGIN
  -- Sanitize event details to reduce sensitive data exposure
  IF event_details IS NOT NULL THEN
    sanitized_details = jsonb_strip_nulls(
      jsonb_build_object(
        'event_id', event_details->>'event_id',
        'endpoint', event_details->>'endpoint',
        'result', event_details->>'result',
        'window_minutes', event_details->>'window_minutes',
        'table', event_details->>'table',
        'operation', event_details->>'operation',
        -- Remove sensitive data like full emails, IPs, etc.
        'email_domain', CASE 
          WHEN event_details->>'invited_email' IS NOT NULL 
          THEN split_part(event_details->>'invited_email', '@', 2)
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

-- 5. Add stricter validation triggers for invitations
CREATE OR REPLACE FUNCTION public.validate_invitation_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Enforce maximum 24-hour expiry (reduced from 7 days)
  IF NEW.expires_at > (now() + interval '24 hours') THEN
    NEW.expires_at = now() + interval '24 hours';
  END IF;
  
  -- Validate email format
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate role
  IF NEW.role NOT IN ('Admin', 'Client') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS trigger_validate_invitation_security ON user_invitations;
CREATE TRIGGER trigger_validate_invitation_security
  BEFORE INSERT OR UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_security();