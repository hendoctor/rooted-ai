-- Remove the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Users can access their client portal data" ON public.users;

-- Create a proper security definer function to get user's client name
CREATE OR REPLACE FUNCTION public.get_current_user_client_name()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT client_name FROM public.users WHERE auth_user_id = auth.uid();
$$;

-- Create a safer policy for client portal access without recursion
CREATE POLICY "Users can access same client data" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = auth_user_id OR 
  (client_name IS NOT NULL AND client_name = get_current_user_client_name())
);