-- Invitation rate limiting: function, trigger, and index

-- 1) Performance index for rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by_created_at
ON public.user_invitations (invited_by, created_at DESC);

-- 2) Function to check rate limits for an admin (returns boolean)
--    Defaults: max 10 invites per 15 minutes, 100 per day
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(
  admin_id uuid,
  max_per_15_minutes integer DEFAULT 10,
  max_per_day integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 3) Trigger to enforce rate limit at DB level
CREATE OR REPLACE FUNCTION public.enforce_invitation_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_15 integer;
  recent_day integer;
  window_15 timestamp;
  window_day timestamp;
  limit_15 constant integer := 10;   -- match function default
  limit_day constant integer := 100; -- match function default
BEGIN
  window_15 := now() - interval '15 minutes';
  window_day := now() - interval '1 day';

  SELECT COUNT(*) INTO recent_15
  FROM public.user_invitations
  WHERE invited_by = NEW.invited_by
    AND created_at >= window_15;

  SELECT COUNT(*) INTO recent_day
  FROM public.user_invitations
  WHERE invited_by = NEW.invited_by
    AND created_at >= window_day;

  IF recent_15 >= limit_15 OR recent_day >= limit_day THEN
    RAISE EXCEPTION 'Invitation rate limit exceeded. Please try again later.'
      USING HINT = format('Limits: %s invites / 15 minutes, %s invites / 24 hours', limit_15, limit_day);
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_enforce_invitation_rate_limit'
  ) THEN
    CREATE TRIGGER trg_enforce_invitation_rate_limit
    BEFORE INSERT ON public.user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_invitation_rate_limit();
  END IF;
END $$;