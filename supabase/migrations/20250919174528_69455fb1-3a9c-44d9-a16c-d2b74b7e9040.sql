-- Fix the incorrect foreign key constraint on user_invitations table
-- Drop the incorrect foreign key that references company_memberships instead of companies
ALTER TABLE public.user_invitations 
DROP CONSTRAINT IF EXISTS user_invitations_company_id_fkey1;

-- Add the correct foreign key constraint that references companies table
ALTER TABLE public.user_invitations 
ADD CONSTRAINT user_invitations_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;