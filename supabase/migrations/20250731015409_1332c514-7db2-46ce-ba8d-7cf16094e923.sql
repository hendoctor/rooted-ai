-- Clean up and rebuild database tables for authentication and role management

-- Drop existing problematic tables and constraints
DROP TABLE IF EXISTS public.invitation_rate_limit CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.rate_limit_log CASCADE;

-- Clean up users table - remove problematic constraints
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_fkey;

-- Recreate user_invitations table without foreign key to users table
CREATE TABLE public.user_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  role TEXT NOT NULL DEFAULT 'Public',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL
);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_invitations
CREATE POLICY "Admins can manage invitations" 
ON public.user_invitations 
FOR ALL 
USING (get_current_user_role() = 'Admin');

-- Create indexes for performance
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_expires ON public.user_invitations(expires_at);

-- Create invitation rate limiting table
CREATE TABLE public.invitation_rate_limit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET
);

-- Enable RLS on invitation_rate_limit
ALTER TABLE public.invitation_rate_limit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for invitation_rate_limit
CREATE POLICY "Admins can manage invitation rate limits" 
ON public.invitation_rate_limit 
FOR ALL 
USING (get_current_user_role() = 'Admin');

-- Update the check_invitation_rate_limit function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(admin_id uuid, max_invites integer DEFAULT 10, window_hours integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (window_hours || ' hours')::interval;
  
  -- Clean old entries
  DELETE FROM invitation_rate_limit 
  WHERE created_at < window_start;
  
  -- Count recent invitations from this admin
  SELECT COUNT(*) INTO recent_count
  FROM invitation_rate_limit
  WHERE admin_user_id = admin_id
    AND created_at >= window_start;
  
  -- Check if limit exceeded
  IF recent_count >= max_invites THEN
    RETURN false;
  END IF;
  
  -- Log this invitation attempt
  INSERT INTO invitation_rate_limit (admin_user_id, created_at)
  VALUES (admin_id, now());
  
  RETURN true;
END;
$$;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to profiles table for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();