-- Security hardening: Update RLS policies for contact and security tables

-- 1. Harden contact_form_fingerprints policies
DROP POLICY IF EXISTS "System can manage fingerprint data" ON public.contact_form_fingerprints;
CREATE POLICY "Service role can manage fingerprint data" 
ON public.contact_form_fingerprints 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- 2. Harden contact_form_honeypots policies  
DROP POLICY IF EXISTS "System can log honeypot violations" ON public.contact_form_honeypots;
CREATE POLICY "Service role can log honeypot violations" 
ON public.contact_form_honeypots 
FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

-- 3. Harden invitation_token_attempts policies
DROP POLICY IF EXISTS "System can log invitation attempts" ON public.invitation_token_attempts;
CREATE POLICY "Service role can log invitation attempts" 
ON public.invitation_token_attempts 
FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

-- 4. Update contact_form_rate_limits to be more restrictive
DROP POLICY IF EXISTS "System can manage rate limits" ON public.contact_form_rate_limits;
CREATE POLICY "Service role can manage rate limits" 
ON public.contact_form_rate_limits 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- 5. Add additional validation trigger for contact submissions
CREATE OR REPLACE FUNCTION public.validate_contact_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate email format more strictly
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate message length (prevent very short or very long messages)
  IF LENGTH(TRIM(NEW.message)) < 10 OR LENGTH(TRIM(NEW.message)) > 5000 THEN
    RAISE EXCEPTION 'Message must be between 10 and 5000 characters';
  END IF;
  
  -- Validate name (prevent suspicious patterns)
  IF NEW.name ~ '[<>"\''&]' THEN
    RAISE EXCEPTION 'Invalid characters in name field';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply validation trigger to contact submissions
DROP TRIGGER IF EXISTS validate_contact_submission_trigger ON public.contact_submissions;
CREATE TRIGGER validate_contact_submission_trigger
  BEFORE INSERT ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_submission();

-- 6. Add function to check contact form rate limits
CREATE OR REPLACE FUNCTION public.check_contact_form_rate_limit(client_ip inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_submissions integer;
  window_start timestamp;
BEGIN
  window_start := now() - interval '10 minutes';
  
  -- Clean old rate limit entries
  DELETE FROM contact_form_rate_limits 
  WHERE window_start < (now() - interval '1 hour');
  
  -- Count recent submissions from this IP
  SELECT COALESCE(submission_count, 0) INTO recent_submissions
  FROM contact_form_rate_limits
  WHERE ip_address = client_ip
    AND window_start >= (now() - interval '10 minutes');
  
  -- Check if limit exceeded (3 submissions per 10 minutes)
  RETURN COALESCE(recent_submissions, 0) < 3;
END;
$function$;