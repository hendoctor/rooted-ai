-- Create missing profile for jasmine@hennahane.com
INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
VALUES (
  '936b734b-e84c-4fee-b1c9-6eef274ea7cd',
  'jasmine@hennahane.com',
  'Jasmine Hennahane',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = COALESCE(public.profiles.full_name, 'Jasmine Hennahane'),
  updated_at = now();

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
  ON CONFLICT (user_id) DO NOTHING; -- Don't overwrite existing profiles
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profiles when users are inserted
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON public.users;
CREATE TRIGGER create_profile_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();