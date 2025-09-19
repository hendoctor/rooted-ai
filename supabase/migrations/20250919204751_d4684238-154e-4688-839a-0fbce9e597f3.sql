-- Fix multi-company membership issue for Client users

-- First, clean up existing multi-memberships for Client users
-- Keep only the most recent membership for each Client user
WITH client_multi_memberships AS (
  SELECT 
    cm.user_id,
    cm.company_id,
    cm.created_at,
    u.role,
    ROW_NUMBER() OVER (PARTITION BY cm.user_id ORDER BY cm.created_at DESC) as rn
  FROM company_memberships cm
  JOIN users u ON u.auth_user_id = cm.user_id
  WHERE u.role = 'Client'
),
memberships_to_delete AS (
  SELECT user_id, company_id
  FROM client_multi_memberships
  WHERE rn > 1  -- Keep only the most recent (rn = 1)
)
DELETE FROM company_memberships
WHERE (user_id, company_id) IN (
  SELECT user_id, company_id FROM memberships_to_delete
);

-- Create function to enforce single company membership for Client users
CREATE OR REPLACE FUNCTION public.enforce_single_company_for_clients()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role 
  FROM public.users 
  WHERE auth_user_id = NEW.user_id;
  
  -- If user is a Client, ensure they only have one company membership
  IF user_role = 'Client' THEN
    -- Delete any existing company memberships for this Client user
    DELETE FROM public.company_memberships 
    WHERE user_id = NEW.user_id 
    AND company_id != NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce single company membership for Client users
DROP TRIGGER IF EXISTS enforce_single_company_for_clients_trigger ON public.company_memberships;
CREATE TRIGGER enforce_single_company_for_clients_trigger
  BEFORE INSERT ON public.company_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_company_for_clients();