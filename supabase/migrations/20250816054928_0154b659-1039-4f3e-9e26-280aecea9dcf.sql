-- Create company_memberships table as source of truth for RBAC
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure one membership per user per company
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- Create companies table for better organization
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Migrate existing client_name data to companies and memberships
INSERT INTO public.companies (name, slug)
SELECT DISTINCT 
  client_name, 
  lower(regexp_replace(client_name, '[^a-zA-Z0-9]', '', 'g'))
FROM public.users 
WHERE client_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Create company memberships from existing user data
INSERT INTO public.company_memberships (company_id, user_id, role, created_by)
SELECT 
  c.id,
  u.auth_user_id,
  u.role,
  u.auth_user_id
FROM public.users u
JOIN public.companies c ON c.name = u.client_name
WHERE u.client_name IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Create RLS policies for companies
CREATE POLICY "Users can view companies they're members of" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm 
    WHERE cm.company_id = companies.id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);

-- Create RLS policies for company_memberships
CREATE POLICY "Users can view their own memberships" 
ON public.company_memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships" 
ON public.company_memberships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);

CREATE POLICY "Admins can manage all memberships" 
ON public.company_memberships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);

-- Create centralized RBAC function
CREATE OR REPLACE FUNCTION public.require_role(
  required_roles TEXT[], 
  company_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
  has_company_role BOOLEAN := FALSE;
BEGIN
  -- Get user's global role
  SELECT role INTO user_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Admin has access to everything
  IF user_role = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user role is in required roles
  IF user_role = ANY(required_roles) THEN
    -- If company_id is specified, check company membership
    IF company_id_param IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.company_memberships cm
        WHERE cm.user_id = auth.uid() 
        AND cm.company_id = company_id_param
        AND cm.role = ANY(required_roles)
      ) INTO has_company_role;
      
      RETURN has_company_role;
    ELSE
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create function to get user's accessible companies with roles
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE(
  company_id UUID,
  company_name TEXT,
  company_slug TEXT,
  user_role TEXT,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_global_role TEXT;
BEGIN
  -- Get user's global role
  SELECT role INTO user_global_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- If admin, return all companies
  IF user_global_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.slug,
      'Admin'::TEXT,
      TRUE
    FROM public.companies c
    ORDER BY c.name;
  ELSE
    -- Return only companies user is member of
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.slug,
      cm.role,
      FALSE
    FROM public.companies c
    JOIN public.company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = auth.uid()
    ORDER BY c.name;
  END IF;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company 
ON public.company_memberships (user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company 
ON public.company_memberships (company_id);

CREATE INDEX IF NOT EXISTS idx_companies_slug 
ON public.companies (slug);

-- Add updated_at trigger for both tables
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_memberships_updated_at
  BEFORE UPDATE ON public.company_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();