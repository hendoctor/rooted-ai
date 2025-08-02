-- Fix the data inconsistency for james@hennahane.com
-- Update the users table to use the correct auth user ID
UPDATE public.users 
SET id = '323c39ab-bb6c-4a14-ac2d-5abd2a9a0e97'
WHERE email = 'james@hennahane.com' AND id = '6cc769ac-2480-4487-bf82-20774a362b2b';

-- Add a unique constraint to prevent duplicate emails in users table
ALTER TABLE public.users ADD CONSTRAINT unique_users_email UNIQUE (email);

-- Create a function to ensure user data consistency
CREATE OR REPLACE FUNCTION public.ensure_user_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Ensure users table entry exists with correct auth user ID
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'Public', now(), now())
  ON CONFLICT (email) DO UPDATE SET
    id = NEW.id,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to maintain consistency when profiles are created/updated
CREATE TRIGGER ensure_user_consistency_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_consistency();