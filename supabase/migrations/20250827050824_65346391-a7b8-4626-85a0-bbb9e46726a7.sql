-- Fix case sensitivity in invitation validation
CREATE OR REPLACE FUNCTION public.validate_invitation_secure(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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