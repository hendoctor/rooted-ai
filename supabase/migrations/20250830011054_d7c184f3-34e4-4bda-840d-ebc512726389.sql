-- Enable pgcrypto extension for hashing utilities (safe in public schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Fix log_security_event_enhanced to use correct digest signature with convert_to(..., 'UTF8')
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text,
  event_details jsonb DEFAULT NULL::jsonb,
  user_id uuid DEFAULT auth.uid(),
  risk_level text DEFAULT 'medium'::text
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
          THEN encode(digest(convert_to(event_details->>'client_ip', 'UTF8'), 'sha256'), 'hex')
          ELSE NULL
        END,
        'email_domain', CASE 
          WHEN event_details->>'email' IS NOT NULL 
          THEN split_part(event_details->>'email', '@', 2)
          ELSE NULL
        END,
        'user_agent_hash', CASE
          WHEN event_details->>'user_agent' IS NOT NULL
          THEN encode(digest(convert_to(event_details->>'user_agent', 'UTF8'), 'sha256'), 'hex')
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