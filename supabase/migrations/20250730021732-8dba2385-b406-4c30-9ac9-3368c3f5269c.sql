-- Fix Critical RLS Policy Issues
-- Add policy to prevent users from updating their own role in the users table
CREATE POLICY "Users cannot update their own role" 
ON public.users 
FOR UPDATE 
USING (false)
WITH CHECK (false);

-- Only allow admins to update user roles
CREATE POLICY "Only admins can update user roles" 
ON public.users 
FOR UPDATE 
USING (get_current_user_role() = 'Admin')
WITH CHECK (get_current_user_role() = 'Admin');

-- Add rate limiting for invitation system
CREATE TABLE IF NOT EXISTS public.invitation_rate_limit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet
);

-- Enable RLS on invitation rate limit table
ALTER TABLE public.invitation_rate_limit ENABLE ROW LEVEL SECURITY;

-- Create policy for invitation rate limiting
CREATE POLICY "Admins can manage invitation rate limits" 
ON public.invitation_rate_limit 
FOR ALL 
USING (get_current_user_role() = 'Admin');

-- Enhanced security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_details jsonb DEFAULT NULL,
  user_id uuid DEFAULT auth.uid()
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    event_type,
    event_details,
    created_at
  ) VALUES (
    user_id,
    event_type,
    event_details,
    now()
  );
END;
$$;

-- Function to check invitation rate limit
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(
  admin_id uuid,
  max_invites integer DEFAULT 10,
  window_hours integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (window_hours || ' hours')::interval;
  
  -- Clean old entries
  DELETE FROM invitation_rate_limit 
  WHERE created_at < window_start;
  
  -- Count recent invitations from this admin
  SELECT COUNT(*) INTO recent_count
  FROM invitation_rate_limit
  WHERE admin_user_id = admin_id
    AND created_at >= window_start;
  
  -- Check if limit exceeded
  IF recent_count >= max_invites THEN
    RETURN false;
  END IF;
  
  -- Log this invitation attempt
  INSERT INTO invitation_rate_limit (admin_user_id, created_at)
  VALUES (admin_id, now());
  
  RETURN true;
END;
$$;