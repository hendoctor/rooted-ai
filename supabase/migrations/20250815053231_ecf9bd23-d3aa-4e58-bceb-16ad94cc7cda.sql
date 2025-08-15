-- Create a trigger to automatically create profile records when users are created
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Create a profile record for the new user
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
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profiles when users are inserted
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON public.users;
CREATE TRIGGER create_profile_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

-- Create missing profile for existing user jasmine@hennahane.com
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get the user record for jasmine@hennahane.com
  SELECT auth_user_id, email INTO user_record 
  FROM public.users 
  WHERE email = 'jasmine@hennahane.com';
  
  -- If user exists but no profile, create one
  IF user_record.auth_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
    VALUES (
      user_record.auth_user_id,
      user_record.email,
      'Jasmine Hennahane', -- Set a default name
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, 'Jasmine Hennahane'),
      updated_at = now();
  END IF;
END;
$$;