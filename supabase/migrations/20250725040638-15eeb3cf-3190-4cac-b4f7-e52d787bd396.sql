-- Fix missing INSERT policy for contact_submissions
CREATE POLICY "Allow contact form submissions" 
ON public.contact_submissions 
FOR INSERT 
WITH CHECK (true);

-- Add server-side rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  max_requests integer DEFAULT 5,
  window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (window_seconds || ' seconds')::interval;
  
  -- Clean old entries
  DELETE FROM rate_limit_log 
  WHERE created_at < window_start;
  
  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM rate_limit_log
  WHERE identifier_key = identifier
    AND created_at >= window_start;
  
  -- Check if limit exceeded
  IF request_count >= max_requests THEN
    RETURN false;
  END IF;
  
  -- Log this request
  INSERT INTO rate_limit_log (identifier_key, created_at)
  VALUES (identifier, now());
  
  RETURN true;
END;
$$;

-- Create rate limiting log table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate_limit_log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for rate_limit_log (system use only)
CREATE POLICY "System can manage rate limit log" 
ON public.rate_limit_log 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for security_audit_log (admin access only)
CREATE POLICY "Admins can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (get_current_user_role() = 'Admin');

CREATE POLICY "System can insert security audit log" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);