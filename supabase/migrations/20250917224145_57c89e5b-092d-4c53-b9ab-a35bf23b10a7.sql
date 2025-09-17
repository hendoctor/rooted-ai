-- Create helper function to check if user is member of a company
CREATE OR REPLACE FUNCTION public.user_is_company_member(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.company_memberships cm
        WHERE cm.company_id = check_company_id 
          AND cm.user_id = auth.uid()
    );
$$;

-- Create helper function to get all company IDs a user belongs to
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT ARRAY_AGG(cm.company_id)
    FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid();
$$;

-- Create function to get company members with detailed information
CREATE OR REPLACE FUNCTION public.get_company_members_detailed(p_company_id uuid)
RETURNS TABLE(
    user_id uuid,
    display_name text,
    email text,
    member_role text,
    joined_date timestamp with time zone,
    newsletter_status text,
    newsletter_frequency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Check if user has access to this company (Admin or Company Member)
    IF NOT (is_admin() OR user_is_company_member(p_company_id)) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        u.auth_user_id as user_id,
        COALESCE(u.display_name, u.email) as display_name,
        u.email,
        cm.role as member_role,
        cm.created_at as joined_date,
        COALESCE(ns.status, 'not_subscribed') as newsletter_status,
        COALESCE(ns.frequency, 'weekly') as newsletter_frequency
    FROM company_memberships cm
    JOIN users u ON u.auth_user_id = cm.user_id
    LEFT JOIN newsletter_subscriptions ns ON ns.user_id = u.auth_user_id
    WHERE cm.company_id = p_company_id
    ORDER BY cm.created_at ASC;
END;
$$;

-- Add RLS policy to allow company members to view other members in same company
CREATE POLICY "Company members can view team members"
ON public.company_memberships
FOR SELECT
USING (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM public.company_memberships cm2
        WHERE cm2.user_id = auth.uid() 
        AND cm2.company_id = company_memberships.company_id
    )
);

-- Add RLS policy to allow company members to view basic user details of colleagues
CREATE POLICY "Company members can view colleague profiles"
ON public.users
FOR SELECT
USING (
    is_admin() OR 
    auth_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.company_memberships cm1
        JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() 
        AND cm2.user_id = users.auth_user_id
    )
);