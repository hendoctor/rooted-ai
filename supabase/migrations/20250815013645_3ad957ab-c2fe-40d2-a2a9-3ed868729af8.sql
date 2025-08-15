-- Update the handle_invitation_signup trigger function for better reliability
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
  
  -- Create user record with role from invitation (case-insensitive email match)
  INSERT INTO users (auth_user_id, email, role, created_at, updated_at)
  SELECT NEW.id, NEW.email, ui.role, now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute') -- Recently accepted
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_signup();

-- Add index for better performance on case-insensitive email lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_email_lower ON user_invitations (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_invitations_token_lower ON user_invitations (lower(invitation_token::text));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));