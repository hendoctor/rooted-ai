-- Drop the incorrect foreign key constraint that references company_memberships instead of companies
ALTER TABLE public.user_invitations 
DROP CONSTRAINT user_invitations_company_id_fkey1;