-- Create optimized user context function for zero-flicker auth
CREATE OR REPLACE FUNCTION public.get_user_context_optimized(user_id uuid)
RETURNS TABLE(
  role text,
  companies jsonb,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
        'page', rp.page,
        'access', rp.access,
        'menu_item', rp.menu_item,
        'visible', rp.visible
      )
    ) as permissions_data
    FROM role_permissions rp
    WHERE rp.role = (SELECT user_role FROM user_data)
  )
  SELECT 
    ud.user_role,
    COALESCE(uc.companies_data, '[]'::jsonb),
    COALESCE(up.permissions_data, '[]'::jsonb)
  FROM user_data ud
  LEFT JOIN user_companies uc ON true
  LEFT JOIN user_permissions up ON true;
END;
$$;

-- Create indexes for optimal performance (non-concurrent for migration)
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_lookup 
ON company_memberships(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup 
ON role_permissions(role, page);

CREATE INDEX IF NOT EXISTS idx_users_auth_lookup 
ON users(auth_user_id);

-- Add trigger to automatically refresh cached contexts on role changes
CREATE OR REPLACE FUNCTION public.invalidate_user_context_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log context invalidation for monitoring
  PERFORM log_security_event(
    'context_cache_invalidated',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_affected', COALESCE(NEW.auth_user_id, NEW.user_id, OLD.auth_user_id, OLD.user_id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply cache invalidation triggers
DROP TRIGGER IF EXISTS trigger_invalidate_context_users ON users;
CREATE TRIGGER trigger_invalidate_context_users
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_context_cache();

DROP TRIGGER IF EXISTS trigger_invalidate_context_memberships ON company_memberships;
CREATE TRIGGER trigger_invalidate_context_memberships
  AFTER INSERT OR UPDATE OR DELETE ON company_memberships
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_context_cache();