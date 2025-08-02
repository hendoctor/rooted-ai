-- Create a comprehensive user synchronization system

-- Function to automatically accept invitations when users register
CREATE OR REPLACE FUNCTION sync_invitation_on_user_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Create trigger to sync invitations when users are created
DROP TRIGGER IF EXISTS sync_invitation_trigger ON users;
CREATE TRIGGER sync_invitation_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_invitation_on_user_creation();

-- Function to clean up user data consistently
CREATE OR REPLACE FUNCTION delete_user_completely(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Function to resync user roles from accepted invitations
CREATE OR REPLACE FUNCTION resync_user_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Run the resync function to fix current state
SELECT resync_user_roles();