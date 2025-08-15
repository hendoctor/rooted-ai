-- Let's approach this differently. First, let's directly check what's wrong with jasmine@hennahane.com
-- and create a profile manually

-- Create the profile for jasmine@hennahane.com directly (bypassing triggers)
DO $$
DECLARE
  auth_user_uuid uuid;
  jasmine_user_id uuid;
BEGIN
  -- Get jasmine's auth user ID from auth.users table  
  SELECT id INTO auth_user_uuid 
  FROM auth.users 
  WHERE email = 'jasmine@hennahane.com';
  
  -- Get jasmine's user record ID from users table
  SELECT auth_user_id INTO jasmine_user_id 
  FROM public.users 
  WHERE email = 'jasmine@hennahane.com';
  
  -- If we found her auth record but the users table doesn't have the correct auth_user_id
  IF auth_user_uuid IS NOT NULL THEN
    -- Update the users table with correct auth_user_id if needed
    IF jasmine_user_id IS NULL THEN
      UPDATE public.users 
      SET auth_user_id = auth_user_uuid, updated_at = now()
      WHERE email = 'jasmine@hennahane.com';
    END IF;
    
    -- Create the missing profile
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
      email = EXCLUDED.email,
      updated_at = now();
  END IF;
END;
$$;

-- Now create the trigger for future users (simpler approach)
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
      NEW.email, -- Use email as default name
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING; -- Don't overwrite existing profiles
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profiles when users are inserted/updated
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON public.users;
CREATE TRIGGER create_profile_on_user_insert
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  WHEN (NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION public.create_profile_for_new_user();