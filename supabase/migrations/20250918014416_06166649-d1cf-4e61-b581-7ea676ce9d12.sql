-- Fix infinite recursion in company_memberships RLS policies

-- First, create security definer functions to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.is_company_admin(company_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role = 'Admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(company_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
  );
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Company admins can manage their company memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Company admins can view all memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.company_memberships;

-- Create new non-recursive policies for company_memberships
CREATE POLICY "Global admins can manage all memberships"
ON public.company_memberships
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Company admins can manage memberships in their company"
ON public.company_memberships
FOR ALL
TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "Users can view their own company memberships"
ON public.company_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update companies table policies to use security definer functions
DROP POLICY IF EXISTS "Company members can update their company details" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they're members of" ON public.companies;

CREATE POLICY "Company members can view their companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_company_member(id));

CREATE POLICY "Company admins can update their company details"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_company_admin(id))
WITH CHECK (public.is_company_admin(id));

-- Log the fix
PERFORM log_security_event_enhanced(
  'rls_infinite_recursion_fixed',
  jsonb_build_object(
    'tables_affected', ARRAY['company_memberships', 'companies'],
    'functions_created', ARRAY['is_company_admin', 'is_company_member'],
    'timestamp', now()
  ),
  auth.uid(),
  'medium'
);