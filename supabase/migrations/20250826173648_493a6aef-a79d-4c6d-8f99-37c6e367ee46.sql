-- Fix remaining functions that need search_path protection

-- Fix get_current_user_client_name function
CREATE OR REPLACE FUNCTION public.get_current_user_client_name()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT client_name FROM public.users WHERE auth_user_id = auth.uid();
$function$;

-- Fix user_is_company_member function
CREATE OR REPLACE FUNCTION public.user_is_company_member(check_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 
        FROM public.company_memberships cm
        WHERE cm.company_id = check_company_id 
          AND cm.user_id = auth.uid()
    );
$function$;

-- Fix get_user_context_optimized function
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

-- Fix require_role function
CREATE OR REPLACE FUNCTION public.require_role(required_roles text[], company_id_param uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  has_company_role BOOLEAN := FALSE;
BEGIN
  -- Get user's global role
  SELECT role INTO user_role 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Admin has access to everything
  IF user_role = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user role is in required roles
  IF user_role = ANY(required_roles) THEN
    -- If company_id is specified, check company membership
    IF company_id_param IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.company_memberships cm
        WHERE cm.user_id = auth.uid() 
        AND cm.company_id = company_id_param
        AND cm.role = ANY(required_roles)
      ) INTO has_company_role;
      
      RETURN has_company_role;
    ELSE
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'Admin'
  );
$function$;

-- Fix shares_company_with_user function
CREATE OR REPLACE FUNCTION public.shares_company_with_user(target_auth_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = target_auth_id
  );
$function$;