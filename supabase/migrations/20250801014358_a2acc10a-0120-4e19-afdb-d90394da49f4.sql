-- Fix security issues: Set search_path for all functions
-- This prevents SQL injection attacks through search_path manipulation

-- Fix cleanup_expired_invitations function
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.user_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < now() AT TIME ZONE 'UTC';
END;
$$;

-- Fix check_invitation_expiry function
CREATE OR REPLACE FUNCTION public.check_invitation_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- If checking an invitation that should be expired, mark it as expired
  IF NEW.status = 'pending' AND NEW.expires_at < now() AT TIME ZONE 'UTC' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;