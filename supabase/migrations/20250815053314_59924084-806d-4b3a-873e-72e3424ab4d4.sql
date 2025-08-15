-- First, let's check and fix the user data for jasmine@hennahane.com
-- We need to get her actual auth_user_id from the auth.users table

-- Create a trigger to automatically create profile records when users are created
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Only create profile if auth_user_id is not null
  IF NEW.auth_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
    VALUES (
      NEW.auth_user_id, 
      NEW.email,
      COALESCE(NEW.email, 'Unknown User'), -- Default name to email if no name provided
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profiles when users are inserted
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON public.users;
CREATE TRIGGER create_profile_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

-- Fix existing user jasmine@hennahane.com by finding her auth_user_id
DO $$
DECLARE
  auth_user_uuid uuid;
BEGIN
  -- Get the actual auth user ID for jasmine@hennahane.com from auth.users
  SELECT id INTO auth_user_uuid 
  FROM auth.users 
  WHERE email = 'jasmine@hennahane.com';
  
  -- If we found the auth user, update the users table and create profile
  IF auth_user_uuid IS NOT NULL THEN
    -- Update the users table with the correct auth_user_id
    UPDATE public.users 
    SET auth_user_id = auth_user_uuid, updated_at = now()
    WHERE email = 'jasmine@hennahane.com';
    
    -- Create the profile record
    INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
    VALUES (
      auth_user_uuid,
      'jasmine@hennahane.com',
      'Jasmine Hennahane',
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, 'Jasmine Hennahane'),
      updated_at = now();
  END IF;
END;
$$;