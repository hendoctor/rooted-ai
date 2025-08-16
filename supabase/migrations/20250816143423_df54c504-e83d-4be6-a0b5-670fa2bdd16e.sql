-- Fix all remaining functions that need search_path security

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.user_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < now() AT TIME ZONE 'UTC';
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_user_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Ensure users table entry exists with correct auth user ID
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'Public', now(), now())
  ON CONFLICT (email) DO UPDATE SET
    id = NEW.id,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_invitation_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- If checking an invitation that should be expired, mark it as expired
  IF NEW.status = 'pending' AND NEW.expires_at < now() AT TIME ZONE 'UTC' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_invitation_on_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When a new user is created, check if they have a pending invitation
  -- and automatically accept it
  UPDATE user_invitations 
  SET 
    status = 'accepted',
    accepted_at = now()
  WHERE 
    email = NEW.email 
    AND status = 'pending'
    AND expires_at > now();
  
  -- If there was an invitation with a specific role, update the user's role
  UPDATE users 
  SET role = (
    SELECT ui.role 
    FROM user_invitations ui 
    WHERE ui.email = NEW.email 
    AND ui.status = 'accepted' 
    AND ui.accepted_at = now()
    LIMIT 1
  )
  WHERE email = NEW.email
  AND EXISTS (
    SELECT 1 FROM user_invitations ui 
    WHERE ui.email = NEW.email 
    AND ui.status = 'accepted' 
    AND ui.accepted_at = now()
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_auth_id uuid;
BEGIN
  -- Get the auth user ID
  SELECT au.id INTO user_auth_id
  FROM auth.users au
  WHERE au.email = user_email;
  
  -- Delete from profiles first (has foreign key to auth.users)
  DELETE FROM profiles WHERE email = user_email;
  
  -- Delete from users table
  DELETE FROM users WHERE email = user_email;
  
  -- Cancel any pending invitations
  UPDATE user_invitations 
  SET status = 'cancelled' 
  WHERE email = user_email AND status = 'pending';
  
  -- Note: We don't delete from auth.users as that's managed by Supabase Auth
  -- The admin should delete the user from the Auth dashboard if needed
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_user_context_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log context invalidation for monitoring
  PERFORM log_security_event(
    'context_cache_invalidated',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_affected', COALESCE(NEW.auth_user_id, NEW.user_id, OLD.auth_user_id, OLD.user_id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resync_user_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update user roles based on their most recent accepted invitation
  UPDATE users 
  SET role = inv.role,
      updated_at = now()
  FROM (
    SELECT DISTINCT ON (email) 
      email, 
      role,
      accepted_at
    FROM user_invitations 
    WHERE status = 'accepted'
    ORDER BY email, accepted_at DESC
  ) inv
  WHERE users.email = inv.email
  AND users.role != inv.role;
  
  -- Auto-accept invitations for existing users
  UPDATE user_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE status = 'pending'
  AND email IN (SELECT email FROM users)
  AND expires_at > now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_otp_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If this is related to OTP/invitation tokens, ensure reasonable expiry
  IF TG_TABLE_NAME = 'user_invitations' THEN
    -- Limit invitation expiry to maximum 24 hours instead of 7 days
    IF NEW.expires_at > (now() + interval '24 hours') THEN
      NEW.expires_at = now() + interval '24 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role changes for security audit
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM log_security_event(
      'role_change',
      jsonb_build_object(
        'user_email', NEW.email,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.email()
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_invitation_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When a new auth user is created, check for pending invitation
  UPDATE user_invitations 
  SET 
    status = 'accepted',
    accepted_at = now()
  WHERE 
    lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now();
  
  -- Create user record with role, client_name, and display_name from invitation
  INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
  SELECT NEW.id, NEW.email, ui.role, ui.client_name, ui.full_name, now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute')
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    client_name = EXCLUDED.client_name,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;