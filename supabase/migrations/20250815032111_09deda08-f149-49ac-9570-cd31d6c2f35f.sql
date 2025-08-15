-- Phase 1: Critical Security Fixes

-- 1. Fix invitation expiry - reduce from 7 days to 24 hours maximum
ALTER TABLE user_invitations 
ALTER COLUMN expires_at SET DEFAULT ((now() AT TIME ZONE 'UTC') + '24 hours'::interval);

-- 2. Restrict role_permissions table access to only admins
DROP POLICY IF EXISTS "Authenticated users can read role permissions" ON role_permissions;
CREATE POLICY "Only admins can read role permissions" ON role_permissions
FOR SELECT USING (get_current_user_role() = 'Admin');

-- 3. Add comprehensive security logging for invitations
CREATE OR REPLACE FUNCTION log_invitation_access(
  token_used text,
  access_result text,
  user_ip inet DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 4. Create secure invitation validation function
CREATE OR REPLACE FUNCTION validate_invitation_secure(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record user_invitations%ROWTYPE;
  result jsonb;
BEGIN
  -- Exact case-sensitive token match only
  SELECT * INTO invitation_record
  FROM user_invitations
  WHERE invitation_token::text = token_input
    AND status = 'pending'
    AND expires_at > now();
  
  IF invitation_record.id IS NULL THEN
    -- Log failed attempt
    PERFORM log_invitation_access(token_input, 'invalid_token');
    
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Log successful validation
  PERFORM log_invitation_access(token_input, 'valid_token');
  
  RETURN jsonb_build_object(
    'valid', true,
    'invitation', row_to_json(invitation_record)
  );
END;
$$;

-- 5. Add rate limiting for invitation token attempts
CREATE TABLE IF NOT EXISTS invitation_token_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  token_prefix text NOT NULL, -- Only store first 8 chars for privacy
  attempt_time timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS on invitation attempts
ALTER TABLE invitation_token_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view attempt logs
CREATE POLICY "Admins can view invitation attempts" ON invitation_token_attempts
FOR SELECT USING (get_current_user_role() = 'Admin');

-- System can insert attempt logs
CREATE POLICY "System can log invitation attempts" ON invitation_token_attempts
FOR INSERT WITH CHECK (true);

-- 6. Create rate limiting function for invitation attempts
CREATE OR REPLACE FUNCTION check_invitation_attempt_rate_limit(
  client_ip inet,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 7. Update existing invitations to use new expiry
UPDATE user_invitations 
SET expires_at = created_at + '24 hours'::interval
WHERE status = 'pending' 
  AND expires_at > (created_at + '24 hours'::interval);

-- 8. Add index for better security query performance
CREATE INDEX IF NOT EXISTS idx_invitation_token_attempts_ip_time 
ON invitation_token_attempts(ip_address, attempt_time);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token_status 
ON user_invitations(invitation_token, status, expires_at);