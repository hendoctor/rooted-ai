-- RLS refactor to eliminate recursion and restore admin dashboard functionality

-- 1) Helper functions (safe, SECURITY DEFINER)
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

CREATE OR REPLACE FUNCTION public.shares_company_with_user(target_auth_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = target_auth_id
  );
$$;

-- 2) Users policies
-- Drop recursive/cyclic policy if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users can view users in their companies only'
  ) THEN
    DROP POLICY "Users can view users in their companies only" ON public.users;
  END IF;
END $$;

-- Ensure admin manage all users policy exists and is safe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Admins can manage all users'
  ) THEN
    CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Allow users to view own row and admins or shared-company visibility without recursion
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users and admins can view users by ownership or shared company'
  ) THEN
    CREATE POLICY "Users and admins can view users by ownership or shared company"
    ON public.users
    FOR SELECT
    USING (
      auth.uid() = auth_user_id
      OR public.is_admin()
      OR public.shares_company_with_user(auth_user_id)
    );
  END IF;
END $$;

-- 3) Company memberships policies (replace admin checks to use is_admin())
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_memberships'
      AND policyname = 'Admins can view all memberships'
  ) THEN
    DROP POLICY "Admins can view all memberships" ON public.company_memberships;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_memberships'
      AND policyname = 'Admins can manage all memberships'
  ) THEN
    DROP POLICY "Admins can manage all memberships" ON public.company_memberships;
  END IF;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all memberships"
  ON public.company_memberships
  FOR SELECT
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all memberships"
  ON public.company_memberships
  FOR ALL
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Keep a user-self-view policy (non-recursive)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_memberships'
      AND policyname = 'Users can view their own memberships'
  ) THEN
    CREATE POLICY "Users can view their own memberships"
    ON public.company_memberships
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 4) Companies policies (replace admin policy to use is_admin())
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'companies'
      AND policyname = 'Admins can manage all companies'
  ) THEN
    DROP POLICY "Admins can manage all companies" ON public.companies;
  END IF;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all companies"
  ON public.companies
  FOR ALL
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Keep the existing member-view policy as-is (it doesn't cause recursion)

-- 5) Ensure (user_id, company_id) is unique to support upserts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'company_memberships' AND indexname = 'company_memberships_user_company_key'
  ) THEN
    CREATE UNIQUE INDEX company_memberships_user_company_key
      ON public.company_memberships(user_id, company_id);
  END IF;
END $$;
