-- Fix database relationships safely by handling orphaned records
-- Phase 1: Clean up and establish proper relationships

-- Add auth_user_id column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Update existing users to link their auth_user_id based on email matching
UPDATE public.users 
SET auth_user_id = au.id 
FROM auth.users au 
WHERE public.users.email = au.email AND public.users.auth_user_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Add users_id column to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS users_id UUID;

-- Update profiles to link to users table via email matching (only where match exists)
UPDATE public.profiles 
SET users_id = u.id 
FROM public.users u 
WHERE public.profiles.email = u.email 
AND public.profiles.users_id IS NULL;

-- Remove orphaned profiles that don't have corresponding users
DELETE FROM public.profiles 
WHERE users_id IS NULL 
AND email NOT IN (SELECT email FROM public.users);

-- Create user records for profiles that exist but don't have users
INSERT INTO public.users (email, role, auth_user_id)
SELECT DISTINCT p.email, 'Public', au.id
FROM public.profiles p
LEFT JOIN public.users u ON p.email = u.email
LEFT JOIN auth.users au ON p.email = au.email
WHERE u.id IS NULL AND p.users_id IS NULL;

-- Now update the remaining profiles
UPDATE public.profiles 
SET users_id = u.id 
FROM public.users u 
WHERE public.profiles.email = u.email 
AND public.profiles.users_id IS NULL;

-- Add foreign key constraint from profiles to users (now safe)
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_users 
FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Create function to get user role by auth user ID
CREATE OR REPLACE FUNCTION public.get_user_role_by_auth_id(auth_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = $1 LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Update get_current_user_role to use the new function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT public.get_user_role_by_auth_id(auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;