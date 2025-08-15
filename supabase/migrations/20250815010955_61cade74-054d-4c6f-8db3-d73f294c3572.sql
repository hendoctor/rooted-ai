-- Fix database relationships to use proper foreign keys with UUIDs
-- Phase 1: Add auth_user_id column to users table and create proper relationships

-- Add auth_user_id column to users table to link to auth.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Update existing users to link their auth_user_id based on email matching
UPDATE public.users 
SET auth_user_id = au.id 
FROM auth.users au 
WHERE public.users.email = au.email AND public.users.auth_user_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Update profiles table to reference users.id instead of auth.users.id directly
-- First, add a column to link to users table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS users_id UUID;

-- Update profiles to link to users table via email matching
UPDATE public.profiles 
SET users_id = u.id 
FROM public.users u 
WHERE public.profiles.email = u.email AND public.profiles.users_id IS NULL;

-- Add foreign key constraint from profiles to users
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_users 
FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update user_invitations to have proper foreign key to users table
ALTER TABLE public.user_invitations 
ADD CONSTRAINT fk_user_invitations_invited_by 
FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add optional foreign key for contact_submissions to link authenticated users
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.contact_submissions 
ADD CONSTRAINT fk_contact_submissions_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create function to get user role by auth user ID (more reliable than email)
CREATE OR REPLACE FUNCTION public.get_user_role_by_auth_id(auth_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = $1 LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Update get_current_user_role to use the new function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT public.get_user_role_by_auth_id(auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;