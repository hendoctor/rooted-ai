-- Rollback migration: Remove problematic policies and functions

-- Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Company members can view team members" ON public.company_memberships;
DROP POLICY IF EXISTS "Company members can view colleague profiles" ON public.users;

-- Drop the functions created in the previous migration
DROP FUNCTION IF EXISTS public.get_company_members_detailed(uuid);
DROP FUNCTION IF EXISTS public.get_user_company_ids();
DROP FUNCTION IF EXISTS public.user_is_company_member(uuid);