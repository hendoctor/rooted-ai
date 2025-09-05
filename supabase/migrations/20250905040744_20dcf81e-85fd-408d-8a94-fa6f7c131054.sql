-- Create a simplified, reliable user profile function
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS TABLE(
  user_role text,
  user_email text,
  user_display_name text,
  user_client_name text,
  companies jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.role as user_role,
    u.email as user_email,
    u.display_name as user_display_name,
    u.client_name as user_client_name,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'userRole', cm.role,
            'isAdmin', (u.role = 'Admin')
          )
        )
        FROM companies c
        INNER JOIN company_memberships cm ON cm.company_id = c.id
        WHERE cm.user_id = p_user_id
      ),
      '[]'::jsonb
    ) as companies
  FROM users u
  WHERE u.auth_user_id = p_user_id;
  
  -- If no user found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'Client'::text as user_role,
      ''::text as user_email,
      ''::text as user_display_name,
      ''::text as user_client_name,
      '[]'::jsonb as companies;
  END IF;
END;
$$;