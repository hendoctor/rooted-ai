-- Fix remaining database functions that need search_path security

CREATE OR REPLACE FUNCTION public.require_role(required_roles text[], company_id_param uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role TEXT;
  has_company_role BOOLEAN := FALSE;
BEGIN
  -- Get user's global role
  SELECT role INTO user_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Admin has access to everything
  IF user_role = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user role is in required roles
  IF user_role = ANY(required_roles) THEN
    -- If company_id is specified, check company membership
    IF company_id_param IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.company_memberships cm
        WHERE cm.user_id = auth.uid() 
        AND cm.company_id = company_id_param
        AND cm.role = ANY(required_roles)
      ) INTO has_company_role;
      
      RETURN has_company_role;
    ELSE
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE(company_id uuid, company_name text, company_slug text, user_role text, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_global_role TEXT;
BEGIN
  -- Get user's global role
  SELECT role INTO user_global_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- If admin, return all companies
  IF user_global_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.slug,
      'Admin'::TEXT,
      TRUE
    FROM public.companies c
    ORDER BY c.name;
  ELSE
    -- Return only companies user is member of
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.slug,
      cm.role,
      FALSE
    FROM public.companies c
    JOIN public.company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = auth.uid()
    ORDER BY c.name;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_context_optimized(user_id uuid)
RETURNS TABLE(role text, companies jsonb, permissions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT u.role as user_role
    FROM users u 
    WHERE u.auth_user_id = user_id
    LIMIT 1
  ),
  user_companies AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'company_id', c.id,
        'company_name', c.name,
        'company_slug', c.slug,
        'user_role', cm.role,
        'is_admin', (SELECT user_role = 'Admin' FROM user_data)
      )
    ) as companies_data
    FROM companies c
    JOIN company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = user_id
  ),
  user_permissions AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'page', rp.page,
        'access', rp.access,
        'menu_item', rp.menu_item,
        'visible', rp.visible
      )
    ) as permissions_data
    FROM role_permissions rp
    WHERE rp.role = (SELECT user_role FROM user_data)
  )
  SELECT 
    ud.user_role,
    COALESCE(uc.companies_data, '[]'::jsonb),
    COALESCE(up.permissions_data, '[]'::jsonb)
  FROM user_data ud
  LEFT JOIN user_companies uc ON true
  LEFT JOIN user_permissions up ON true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_invitation_secure(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  invitation_record user_invitations%ROWTYPE;
  client_ip inet;
BEGIN
  -- Get client IP for rate limiting
  client_ip := inet_client_addr();
  
  -- Check rate limit first (5 attempts per 15 minutes per IP)
  IF NOT check_invitation_attempt_rate_limit(client_ip, 5, 15) THEN
    -- Log rate limit hit
    PERFORM log_security_event(
      'invitation_rate_limit_exceeded',
      jsonb_build_object(
        'ip_address', client_ip,
        'token_prefix', left(token_input, 8)
      )
    );
    
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Too many attempts. Please try again later.'
    );
  END IF;

  -- Record the attempt
  INSERT INTO invitation_token_attempts (
    ip_address,
    token_prefix,
    success,
    attempt_time
  ) VALUES (
    client_ip,
    left(token_input, 8),
    false, -- Will be updated to true if successful
    now()
  );

  -- Exact case-sensitive token match only - no case variations
  SELECT * INTO invitation_record
  FROM user_invitations
  WHERE invitation_token::text = token_input
    AND status = 'pending'
    AND expires_at > now();
  
  IF invitation_record.id IS NULL THEN
    -- Log failed attempt with more details
    PERFORM log_security_event(
      'invitation_token_invalid',
      jsonb_build_object(
        'token_prefix', left(token_input, 8),
        'ip_address', client_ip,
        'timestamp', now()
      )
    );
    
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Update the attempt record to mark as successful
  UPDATE invitation_token_attempts 
  SET success = true 
  WHERE ip_address = client_ip 
    AND token_prefix = left(token_input, 8)
    AND attempt_time = (
      SELECT MAX(attempt_time) 
      FROM invitation_token_attempts 
      WHERE ip_address = client_ip 
        AND token_prefix = left(token_input, 8)
    );
  
  -- Log successful validation with enhanced details
  PERFORM log_security_event(
    'invitation_token_valid',
    jsonb_build_object(
      'invitation_id', invitation_record.id,
      'invited_email', invitation_record.email,
      'invited_role', invitation_record.role,
      'ip_address', client_ip,
      'timestamp', now()
    )
  );
  
  RETURN jsonb_build_object(
    'valid', true,
    'invitation', row_to_json(invitation_record)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_invitation_attempt_rate_limit(client_ip inet, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  recent_attempts integer;
  window_start timestamp;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean old attempts
  DELETE FROM invitation_token_attempts 
  WHERE attempt_time < window_start;
  
  -- Count recent failed attempts from this IP
  SELECT COUNT(*) INTO recent_attempts
  FROM invitation_token_attempts
  WHERE ip_address = client_ip
    AND attempt_time >= window_start
    AND success = false;
  
  -- Check if limit exceeded
  RETURN recent_attempts < max_attempts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_invitation_access(token_used text, access_result text, user_ip inet DEFAULT NULL::inet)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    event_details,
    ip_address,
    created_at
  ) VALUES (
    'invitation_token_access',
    jsonb_build_object(
      'token_prefix', left(token_used, 8),
      'result', access_result,
      'timestamp', now()
    ),
    user_ip,
    now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(admin_id uuid, max_per_15_minutes integer DEFAULT 10, max_per_day integer DEFAULT 100)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  recent_15 integer;
  recent_day integer;
  window_15 timestamp;
  window_day timestamp;
BEGIN
  window_15 := now() - interval '15 minutes';
  window_day := now() - interval '1 day';

  SELECT COUNT(*) INTO recent_15
  FROM public.user_invitations
  WHERE invited_by = admin_id
    AND created_at >= window_15;

  SELECT COUNT(*) INTO recent_day
  FROM public.user_invitations
  WHERE invited_by = admin_id
    AND created_at >= window_day;

  RETURN (recent_15 < max_per_15_minutes) AND (recent_day < max_per_day);
END;
$function$;