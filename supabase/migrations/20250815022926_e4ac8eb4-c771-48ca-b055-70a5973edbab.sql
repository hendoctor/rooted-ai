-- Add client_name to users table
ALTER TABLE public.users 
ADD COLUMN client_name TEXT;

-- Add client_name to user_invitations table
ALTER TABLE public.user_invitations 
ADD COLUMN client_name TEXT;

-- Update the handle_invitation_signup function to include client_name
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
  
  -- Create user record with role and client_name from invitation
  INSERT INTO users (auth_user_id, email, role, client_name, created_at, updated_at)
  SELECT NEW.id, NEW.email, ui.role, ui.client_name, now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute')
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    client_name = EXCLUDED.client_name,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Add RLS policy for client portal access
CREATE POLICY "Users can access their client portal data" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = auth_user_id OR 
  (client_name IS NOT NULL AND client_name = (
    SELECT u.client_name FROM users u WHERE u.auth_user_id = auth.uid()
  ))
);

-- Update profiles table to allow user updates
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);