-- Update get_user_context_optimized function to remove role_permissions dependency
CREATE OR REPLACE FUNCTION public.get_user_context_optimized(user_id uuid)
RETURNS TABLE(role text, companies jsonb, permissions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT u.role as user_role
    FROM users u 
    WHERE u.auth_user_id = user_id
    LIMIT 1
  ),
  user_companies AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'company_id', c.id,
        'company_name', c.name,
        'company_slug', c.slug,
        'user_role', cm.role,
        'is_admin', (SELECT user_role = 'Admin' FROM user_data)
      )
    ) as companies_data
    FROM companies c
    JOIN company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = user_id
  ),
  user_permissions AS (
    -- Generate permissions based on role from users table
    SELECT jsonb_agg(
      jsonb_build_object(
        'page', perm.page,
        'access', perm.access,
        'menu_item', perm.menu_item,
        'visible', perm.visible
      )
    ) as permissions_data
    FROM (
      SELECT 
        '/' as page,
        true as access,
        null as menu_item,
        false as visible
      WHERE (SELECT user_role FROM user_data) IN ('Admin', 'Client')
      
      UNION ALL
      
      SELECT 
        '/admin' as page,
        true as access,
        'Admin' as menu_item,
        true as visible
      WHERE (SELECT user_role FROM user_data) = 'Admin'
      
      UNION ALL
      
      SELECT 
        '/profile' as page,
        true as access,
        null as menu_item,
        false as visible
      WHERE (SELECT user_role FROM user_data) IN ('Admin', 'Client')
    ) perm
  )
  SELECT 
    ud.user_role,
    COALESCE(uc.companies_data, '[]'::jsonb),
    COALESCE(up.permissions_data, '[]'::jsonb)
  FROM user_data ud
  LEFT JOIN user_companies uc ON true
  LEFT JOIN user_permissions up ON true;
END;
$function$;