-- Create role_permissions table for menu and page access
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role text NOT NULL,
  page text NOT NULL,
  access boolean NOT NULL DEFAULT false,
  menu_item text,
  visible boolean NOT NULL DEFAULT false
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read role permissions" ON public.role_permissions
FOR SELECT USING (true);

CREATE POLICY "Admins manage role permissions" ON public.role_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'Admin'
  )
);

-- Default permissions
INSERT INTO public.role_permissions (role, page, access, menu_item, visible) VALUES
  ('public', '/', true, NULL, false),
  ('public', '/auth', true, NULL, false),
  ('client', '/', true, NULL, false),
  ('client', '/vapid-setup', true, 'VAPID Setup', true),
  ('admin', '/', true, NULL, false),
  ('admin', '/admin', true, 'Admin', true),
  ('admin', '/admin-center', true, 'Admin Center', true),
  ('admin', '/vapid-setup', true, 'VAPID Setup', true);
