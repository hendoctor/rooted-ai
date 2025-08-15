-- Remove Public role and simplify to Client/Admin only
-- Update all existing users with Public role to Client role
UPDATE users SET role = 'Client' WHERE role = 'Public';

-- Update all role_permissions for Public to Client
UPDATE role_permissions SET role = 'Client' WHERE role = 'Public';

-- Update all user_invitations for Public to Client  
UPDATE user_invitations SET role = 'Client' WHERE role = 'Public';

-- Add constraint to only allow Client and Admin roles
ALTER TABLE users ADD CONSTRAINT valid_roles CHECK (role IN ('Client', 'Admin'));
ALTER TABLE user_invitations ADD CONSTRAINT valid_invitation_roles CHECK (role IN ('Client', 'Admin'));
ALTER TABLE role_permissions ADD CONSTRAINT valid_permission_roles CHECK (role IN ('Client', 'Admin'));

-- Remove unused tables that aren't needed for simplified admin functions
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS newsletter_subscriptions_auth CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS invitation_rate_limit CASCADE;
DROP TABLE IF EXISTS rate_limit_log CASCADE;

-- Update default role to Client instead of Public
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Client';
ALTER TABLE user_invitations ALTER COLUMN role SET DEFAULT 'Client';

-- Enable realtime for critical tables
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE role_permissions REPLICA IDENTITY FULL;
ALTER TABLE user_invitations REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE role_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Update functions to work with new role system
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$function$;

-- Simplified role logging function
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple role change tracking without security audit table
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    -- Log to PostgreSQL logs for admin review
    RAISE NOTICE 'Role changed for user %: % -> %', NEW.email, OLD.role, NEW.role;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS log_user_role_changes ON users;
CREATE TRIGGER log_user_role_changes
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_role_changes();

-- Update RLS policies to work with Client/Admin only
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Only admins can update user roles" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  USING (get_current_user_role() = 'Admin');

CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  USING (auth_user_id = auth.uid() OR get_current_user_role() = 'Admin');

-- Remove signup capability - only invited users can join
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_consistency() CASCADE;

-- Simplified user creation only through invitations
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

-- Create trigger for invitation-based signup
CREATE TRIGGER on_auth_user_invited
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_invitation_signup();