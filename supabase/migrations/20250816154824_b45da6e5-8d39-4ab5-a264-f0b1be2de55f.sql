-- Fix infinite recursion issues in RLS policies

-- First, drop problematic policies
DROP POLICY IF EXISTS "Users can view users in their companies only" ON public.users;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.company_memberships;

-- Create safe security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_role_safe()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() AND role = 'Admin'
  );
$$;

-- Update users table policies to use safe functions
CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
USING (public.is_admin());

CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth_user_id = auth.uid());

-- Create safe company membership policies
CREATE POLICY "Users can view their own memberships" 
ON public.company_memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships" 
ON public.company_memberships 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can manage all memberships" 
ON public.company_memberships 
FOR ALL 
USING (public.is_admin());

-- Ensure companies are accessible to admins and members
CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
USING (public.is_admin());

-- Add newsletter subscriptions table for admin management
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'website',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on newsletter subscriptions
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage newsletter subscriptions
CREATE POLICY "Admins can manage newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR ALL 
USING (public.is_admin());

-- Allow public to insert (for website signup)
CREATE POLICY "Allow newsletter signup" 
ON public.newsletter_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample companies if they don't exist
INSERT INTO public.companies (name, slug, settings) 
VALUES 
  ('RootedAI', 'rooted-ai', '{"type": "admin_company"}'),
  ('Punky USA', 'punky-usa', '{"type": "client_company"}')
ON CONFLICT (slug) DO NOTHING;

-- Ensure jasmine@hennahane.com is properly set up if exists
DO $$
DECLARE
  jasmine_user_id UUID;
  punky_company_id UUID;
BEGIN
  -- Get jasmine's user ID
  SELECT auth_user_id INTO jasmine_user_id 
  FROM public.users 
  WHERE email = 'jasmine@hennahane.com';
  
  -- Get Punky USA company ID
  SELECT id INTO punky_company_id 
  FROM public.companies 
  WHERE slug = 'punky-usa';
  
  -- Create membership if both exist
  IF jasmine_user_id IS NOT NULL AND punky_company_id IS NOT NULL THEN
    INSERT INTO public.company_memberships (user_id, company_id, role)
    VALUES (jasmine_user_id, punky_company_id, 'Member')
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
END $$;