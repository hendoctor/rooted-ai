-- Ensure REPLICA IDENTITY FULL is set for users table to support instant avatar updates
ALTER TABLE public.users REPLICA IDENTITY FULL;