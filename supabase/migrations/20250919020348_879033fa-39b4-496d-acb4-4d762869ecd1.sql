-- Enable realtime for users table to support instant avatar updates
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.users;