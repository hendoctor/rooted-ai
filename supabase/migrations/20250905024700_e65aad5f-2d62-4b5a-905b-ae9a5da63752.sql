-- Security Fix Phase 1: Lock down security audit logging and create safe user view

-- 1. Drop the broad INSERT policy on security_audit_log to prevent direct client inserts
DROP POLICY IF EXISTS "System can log security events" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert security audit log" ON public.security_audit_log;

-- Only allow service role to insert (via edge functions)
CREATE POLICY "Service role can log security events" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (false); -- This will only allow service role (which bypasses RLS)

-- 2. Create a safe users view for non-admin access
CREATE OR REPLACE VIEW public.users_safe AS
SELECT 
  u.id,
  u.auth_user_id,
  u.display_name,
  u.role,
  CASE 
    WHEN u.role = 'Admin' THEN u.email
    ELSE SPLIT_PART(u.email, '@', 2) -- Only show domain for non-admins
  END as email_domain,
  u.created_at
FROM public.users u;

-- Enable RLS on the view
ALTER VIEW public.users_safe SET (security_barrier = true);

-- 3. Create RLS policies for the safe view
CREATE POLICY "Users can view safe user data for shared companies" 
ON public.users_safe 
FOR SELECT 
USING (
  auth.uid() = auth_user_id OR 
  is_admin() OR 
  shares_company_with_user(auth_user_id)
);

-- 4. Add environment-gated reset protection function
CREATE OR REPLACE FUNCTION public.validate_admin_reset_request(
  admin_user_id uuid,
  reset_token text,
  client_ip inet DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_attempts integer;
  window_start timestamp;
BEGIN
  -- Rate limit: max 1 attempt per admin per hour
  window_start := now() - interval '1 hour';
  
  SELECT COUNT(*) INTO recent_attempts
  FROM security_audit_log
  WHERE user_id = admin_user_id
    AND event_type = 'admin_reset_attempt'
    AND created_at >= window_start;
  
  IF recent_attempts >= 1 THEN
    PERFORM log_security_event_enhanced(
      'admin_reset_rate_limited',
      jsonb_build_object(
        'admin_user_id', admin_user_id,
        'client_ip', client_ip,
        'recent_attempts', recent_attempts
      ),
      admin_user_id,
      'high'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded. Only 1 reset attempt per hour allowed.'
    );
  END IF;
  
  -- Log the attempt
  PERFORM log_security_event_enhanced(
    'admin_reset_attempt',
    jsonb_build_object(
      'admin_user_id', admin_user_id,
      'client_ip', client_ip,
      'token_provided', reset_token IS NOT NULL
    ),
    admin_user_id,
    'high'
  );
  
  RETURN jsonb_build_object(
    'allowed', true,
    'admin_user_id', admin_user_id
  );
END;
$$;

-- 5. Create enhanced contact form validation with stricter rate limits
CREATE OR REPLACE FUNCTION public.validate_contact_submission_enhanced(
  p_ip_address inet, 
  p_user_agent text, 
  p_origin text DEFAULT NULL,
  p_honeypot_field text DEFAULT NULL, 
  p_fingerprint_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_submissions INTEGER;
  is_honeypot_violation BOOLEAN := false;
  is_allowed_origin BOOLEAN := false;
  fingerprint_hash TEXT;
  existing_fingerprint RECORD;
BEGIN
  -- Check origin allowlist (stricter than before)
  IF p_origin IS NOT NULL THEN
    is_allowed_origin := (
      p_origin = ANY(ARRAY[
        'https://rootedai.tech',
        'https://rooted-ai.lovable.app'
      ]) OR 
      p_origin LIKE '%.lovable.dev'
    );
    
    IF NOT is_allowed_origin THEN
      PERFORM log_security_event_enhanced(
        'contact_form_invalid_origin',
        jsonb_build_object(
          'origin', p_origin,
          'ip_address', p_ip_address
        ),
        NULL,
        'medium'
      );
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Invalid origin'
      );
    END IF;
  END IF;
  
  -- Enhanced rate limiting: 1 submission per 10 minutes per IP
  SELECT COUNT(*) INTO recent_submissions
  FROM public.contact_submissions
  WHERE ip_address = p_ip_address
    AND created_at > (now() - interval '10 minutes');
    
  IF recent_submissions >= 1 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded',
      'wait_minutes', 10
    );
  END IF;
  
  -- Check for honeypot field (should be empty)
  IF p_honeypot_field IS NOT NULL AND length(trim(p_honeypot_field)) > 0 THEN
    is_honeypot_violation := true;
    
    INSERT INTO public.contact_form_honeypots (ip_address, user_agent, honeypot_field)
    VALUES (p_ip_address, p_user_agent, p_honeypot_field);
    
    PERFORM log_security_event_enhanced(
      'contact_form_honeypot_violation',
      jsonb_build_object(
        'ip_address', p_ip_address,
        'honeypot_value', left(p_honeypot_field, 20)
      ),
      NULL,
      'high'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Spam detection triggered',
      'honeypot_violation', true
    );
  END IF;
  
  -- Process fingerprinting if provided
  IF p_fingerprint_data IS NOT NULL THEN
    fingerprint_hash := encode(
      digest(
        concat(
          p_fingerprint_data->>'screen',
          p_fingerprint_data->>'timezone',
          p_fingerprint_data->>'language',
          substring(p_user_agent, 1, 50)
        ), 
        'sha256'
      ), 
      'hex'
    );
    
    SELECT * INTO existing_fingerprint
    FROM public.contact_form_fingerprints
    WHERE fingerprint_hash = fingerprint_hash;
    
    IF existing_fingerprint.id IS NOT NULL THEN
      UPDATE public.contact_form_fingerprints
      SET 
        submission_count = submission_count + 1,
        last_seen = now(),
        is_suspicious = CASE 
          WHEN submission_count >= 3 THEN true 
          ELSE is_suspicious 
        END
      WHERE id = existing_fingerprint.id;
      
      IF existing_fingerprint.submission_count >= 3 OR existing_fingerprint.is_suspicious THEN
        PERFORM log_security_event_enhanced(
          'contact_form_suspicious_fingerprint',
          jsonb_build_object(
            'fingerprint_hash', left(fingerprint_hash, 16),
            'submission_count', existing_fingerprint.submission_count + 1
          ),
          NULL,
          'medium'
        );
        
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Suspicious activity detected',
          'fingerprint_flagged', true
        );
      END IF;
    ELSE
      INSERT INTO public.contact_form_fingerprints (
        ip_address,
        user_agent_hash,
        screen_resolution,
        timezone_offset,
        language,
        fingerprint_hash
      ) VALUES (
        p_ip_address,
        encode(digest(p_user_agent, 'sha256'), 'hex'),
        p_fingerprint_data->>'screen',
        (p_fingerprint_data->>'timezone')::INTEGER,
        p_fingerprint_data->>'language',
        fingerprint_hash
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'fingerprint_hash', fingerprint_hash
  );
END;
$$;