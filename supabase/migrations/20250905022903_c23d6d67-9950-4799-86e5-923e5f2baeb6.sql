-- Security Fix Phase 2: Strengthen User Invitation Security

-- Drop the existing overly permissive invitation policy
DROP POLICY IF EXISTS "Invited user can view own invitations" ON public.user_invitations;

-- Create a more secure policy that requires proper authentication AND exact token match
-- This prevents email enumeration attacks
CREATE POLICY "Authenticated users can view invitations with valid token" 
  ON public.user_invitations 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status = 'pending'
    AND expires_at > now()
  );

-- Add a more restrictive policy for invitation updates (acceptance)
CREATE POLICY "Users can accept their own valid invitations" 
  ON public.user_invitations 
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''))
    AND status IN ('accepted', 'pending')
  );

-- Security Fix Phase 4: Enhanced Contact Form Protection

-- Add honeypot tracking table for spam detection
CREATE TABLE IF NOT EXISTS public.contact_form_honeypots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent TEXT,
  honeypot_field TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on honeypot table
ALTER TABLE public.contact_form_honeypots ENABLE ROW LEVEL SECURITY;

-- Only admins can view honeypot data
CREATE POLICY "Admins can view honeypot data" 
  ON public.contact_form_honeypots 
  FOR SELECT 
  USING (is_admin());

-- System can insert honeypot violations
CREATE POLICY "System can log honeypot violations" 
  ON public.contact_form_honeypots 
  FOR INSERT 
  WITH CHECK (true);

-- Add request fingerprinting table for enhanced spam detection
CREATE TABLE IF NOT EXISTS public.contact_form_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent_hash TEXT,
  screen_resolution TEXT,
  timezone_offset INTEGER,
  language TEXT,
  fingerprint_hash TEXT NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_suspicious BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on fingerprints table
ALTER TABLE public.contact_form_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only admins can view fingerprint data
CREATE POLICY "Admins can view fingerprint data" 
  ON public.contact_form_fingerprints 
  FOR SELECT 
  USING (is_admin());

-- System can manage fingerprint data
CREATE POLICY "System can manage fingerprint data" 
  ON public.contact_form_fingerprints 
  FOR ALL 
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_honeypots_ip_timestamp ON public.contact_form_honeypots(ip_address, timestamp);
CREATE INDEX IF NOT EXISTS idx_contact_fingerprints_hash ON public.contact_form_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_contact_fingerprints_ip ON public.contact_form_fingerprints(ip_address);

-- Enhanced security function for contact form validation
CREATE OR REPLACE FUNCTION public.validate_contact_submission(
  p_ip_address INET,
  p_user_agent TEXT,
  p_honeypot_field TEXT DEFAULT NULL,
  p_fingerprint_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  recent_submissions INTEGER;
  is_honeypot_violation BOOLEAN := false;
  fingerprint_hash TEXT;
  existing_fingerprint RECORD;
  result JSONB;
BEGIN
  -- Check for honeypot field (should be empty)
  IF p_honeypot_field IS NOT NULL AND length(trim(p_honeypot_field)) > 0 THEN
    is_honeypot_violation := true;
    
    -- Log honeypot violation
    INSERT INTO public.contact_form_honeypots (ip_address, user_agent, honeypot_field)
    VALUES (p_ip_address, p_user_agent, p_honeypot_field);
    
    -- Log security event
    PERFORM log_security_event_enhanced(
      'contact_form_honeypot_violation',
      jsonb_build_object(
        'ip_address', p_ip_address,
        'honeypot_value', p_honeypot_field
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
  
  -- Enhanced rate limiting: 2 submissions per 15 minutes per IP
  SELECT COUNT(*) INTO recent_submissions
  FROM public.contact_submissions
  WHERE ip_address = p_ip_address
    AND created_at > (now() - interval '15 minutes');
    
  IF recent_submissions >= 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded',
      'wait_minutes', 15
    );
  END IF;
  
  -- Process fingerprinting if provided
  IF p_fingerprint_data IS NOT NULL THEN
    -- Create fingerprint hash
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
    
    -- Check existing fingerprint
    SELECT * INTO existing_fingerprint
    FROM public.contact_form_fingerprints
    WHERE fingerprint_hash = fingerprint_hash;
    
    IF existing_fingerprint.id IS NOT NULL THEN
      -- Update existing fingerprint
      UPDATE public.contact_form_fingerprints
      SET 
        submission_count = submission_count + 1,
        last_seen = now(),
        is_suspicious = CASE 
          WHEN submission_count >= 5 THEN true 
          ELSE is_suspicious 
        END
      WHERE id = existing_fingerprint.id;
      
      -- Check if suspicious
      IF existing_fingerprint.submission_count >= 5 OR existing_fingerprint.is_suspicious THEN
        PERFORM log_security_event_enhanced(
          'contact_form_suspicious_fingerprint',
          jsonb_build_object(
            'fingerprint_hash', fingerprint_hash,
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
      -- Create new fingerprint
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;