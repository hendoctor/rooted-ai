-- Fix the handle_invitation_signup trigger function
-- The issue is that it's trying to access NEW.user_id but auth.users table uses NEW.id

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Create company membership if invitation has a company_id
  INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
  SELECT ui.company_id, NEW.id, 'Member', now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute')
    AND ui.company_id IS NOT NULL
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (company_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;