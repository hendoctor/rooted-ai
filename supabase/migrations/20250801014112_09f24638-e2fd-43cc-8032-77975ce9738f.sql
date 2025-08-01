-- Fix timezone handling and add database improvements for invitations
-- Set default timezone to UTC for consistency
ALTER TABLE public.user_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() AT TIME ZONE 'UTC' + interval '7 days');

-- Add an index for better performance on invitation queries
CREATE INDEX IF NOT EXISTS idx_user_invitations_token_status 
ON public.user_invitations(invitation_token, status);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email_status 
ON public.user_invitations(email, status);

CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at 
ON public.user_invitations(expires_at);

-- Add function to clean up expired invitations automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < now() AT TIME ZONE 'UTC';
END;
$$;

-- Add trigger to automatically update invitation status on expiry check
CREATE OR REPLACE FUNCTION public.check_invitation_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If checking an invitation that should be expired, mark it as expired
  IF NEW.status = 'pending' AND NEW.expires_at < now() AT TIME ZONE 'UTC' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic expiration checking
DROP TRIGGER IF EXISTS trigger_check_invitation_expiry ON public.user_invitations;
CREATE TRIGGER trigger_check_invitation_expiry
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invitation_expiry();

-- Enable real-time for better user management
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.user_invitations REPLICA IDENTITY FULL;

-- Add users and invitations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_invitations;