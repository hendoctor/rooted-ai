-- Ensure james@hennahane.com gets admin role on signup and existing records

-- Update trigger function for user roles
CREATE OR REPLACE FUNCTION public.add_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'james@hennahane.com'
         THEN 'Admin'
         ELSE 'Client'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_users ON auth.users;
CREATE TRIGGER on_auth_user_created_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_role();

-- Update profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    CASE WHEN NEW.email = 'james@hennahane.com'
         THEN 'admin'
         ELSE 'client'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure existing records use correct role
UPDATE public.users
SET role = 'Admin'
WHERE email = 'james@hennahane.com';

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'james@hennahane.com';
