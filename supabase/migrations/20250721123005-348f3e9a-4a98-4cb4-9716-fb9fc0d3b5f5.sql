-- Ensure james@hennahane.com is an admin user
INSERT INTO public.users (email, role) 
VALUES ('james@hennahane.com', 'Admin')
ON CONFLICT (email) 
DO UPDATE SET role = 'Admin';

-- Update role_permissions with proper case-sensitive roles
DELETE FROM public.role_permissions WHERE role IN ('public', 'client', 'admin');

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