-- Add display_name column to users table
ALTER TABLE public.users 
ADD COLUMN display_name TEXT;

-- Migrate existing data from profiles table to users table if any exists
UPDATE public.users 
SET display_name = p.full_name
FROM public.profiles p 
WHERE public.users.auth_user_id = p.user_id;

-- Drop the profiles table and all related objects
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop any functions related to profiles
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop any triggers related to profiles
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_invitation_signup function to not reference profiles
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;