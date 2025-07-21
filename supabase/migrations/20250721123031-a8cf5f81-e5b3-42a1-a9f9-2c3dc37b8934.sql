-- Create users table for role management
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'Public',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT USING (auth.email() = email);

-- Allow admins to manage all users
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.role = 'Admin'
  )
);

-- Create role_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  page text NOT NULL,
  access boolean NOT NULL DEFAULT false,
  menu_item text,
  visible boolean NOT NULL DEFAULT false
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read role permissions (needed for menu rendering)
CREATE POLICY "Allow read role permissions" ON public.role_permissions
FOR SELECT USING (true);

-- Admins can manage role permissions
CREATE POLICY "Admins manage role permissions" ON public.role_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email() AND u.role = 'Admin'
  )
);

-- Insert james@hennahane.com as admin
INSERT INTO public.users (email, role) 
VALUES ('james@hennahane.com', 'Admin');

-- Insert default role permissions
INSERT INTO public.role_permissions (role, page, access, menu_item, visible) VALUES
  ('Public', '/', true, NULL, false),
  ('Public', '/auth', true, NULL, false),
  ('Client', '/', true, NULL, false),
  ('Client', '/auth', true, NULL, false),
  ('Client', '/vapid-setup', true, 'VAPID Setup', true),
  ('Admin', '/', true, NULL, false),
  ('Admin', '/auth', true, NULL, false),
  ('Admin', '/admin', true, 'Admin', true),
  ('Admin', '/admin-center', true, 'Admin Center', true),
  ('Admin', '/vapid-setup', true, 'VAPID Setup', true);