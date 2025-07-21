-- Create users table for role management
CREATE TABLE public.users (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Client' CHECK (role IN ('Admin','Client'))
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.add_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'Client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_users ON auth.users;
CREATE TRIGGER on_auth_user_created_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_role();

-- Backfill existing users
INSERT INTO public.users (id, email, role)
SELECT id, email, 'Client'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Assign admin role to james@hennahane.com if present
UPDATE public.users SET role = 'Admin' WHERE email = 'james@hennahane.com';
