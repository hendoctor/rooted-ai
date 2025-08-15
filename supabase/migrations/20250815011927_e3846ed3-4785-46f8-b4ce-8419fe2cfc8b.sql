-- Fix the migration by properly handling the database structure

-- First, add auth_user_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Update existing users to link with auth.users based on email
UPDATE users 
SET auth_user_id = au.id 
FROM auth.users au 
WHERE users.email = au.email 
AND users.auth_user_id IS NULL;

-- Now update role constraints and defaults
UPDATE users SET role = 'Client' WHERE role = 'Public';
UPDATE role_permissions SET role = 'Client' WHERE role = 'Public';  
UPDATE user_invitations SET role = 'Client' WHERE role = 'Public';

-- Add constraints for Client/Admin only
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_roles') THEN
        ALTER TABLE users ADD CONSTRAINT valid_roles CHECK (role IN ('Client', 'Admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_invitation_roles') THEN
        ALTER TABLE user_invitations ADD CONSTRAINT valid_invitation_roles CHECK (role IN ('Client', 'Admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_permission_roles') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT valid_permission_roles CHECK (role IN ('Client', 'Admin'));
    END IF;
END $$;

-- Update default roles
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Client';
ALTER TABLE user_invitations ALTER COLUMN role SET DEFAULT 'Client';

-- Now create the corrected function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$function$;

-- Create invitation-only signup function
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
    email = NEW.email 
    AND status = 'pending'
    AND expires_at > now();
  
  -- Create user record with role from invitation
  INSERT INTO users (auth_user_id, email, role)
  SELECT NEW.id, NEW.email, ui.role
  FROM user_invitations ui
  WHERE ui.email = NEW.email 
    AND ui.status = 'accepted'
    AND ui.accepted_at = now()
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_invited
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_invitation_signup();