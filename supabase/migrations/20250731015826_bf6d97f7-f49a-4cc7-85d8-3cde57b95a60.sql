-- Ensure james@hennahane.com is an admin
INSERT INTO public.users (email, role) 
VALUES ('james@hennahane.com', 'Admin')
ON CONFLICT (email) 
DO UPDATE SET role = 'Admin';

-- Enable real-time updates for users table
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Enable real-time updates for user_invitations table
ALTER TABLE public.user_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_invitations;