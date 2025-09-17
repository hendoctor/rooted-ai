-- Create secure function for company admins to manage their users
CREATE OR REPLACE FUNCTION public.get_company_users_for_admin(p_company_id uuid)
 RETURNS TABLE(
   email text, 
   name text, 
   status text, 
   role text, 
   companies jsonb, 
   newsletter_status text, 
   newsletter_frequency text, 
   registration_date timestamp with time zone, 
   last_activity timestamp with time zone, 
   source_table text, 
   user_id uuid, 
   invitation_id uuid, 
   newsletter_id uuid, 
   invitation_token uuid, 
   expires_at timestamp with time zone,
   company_role text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow company admins to access this function
  IF NOT public.require_role(ARRAY['Admin'], p_company_id) AND NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH company_user_data AS (
    -- Active registered users in the company
    SELECT 
      u.email,
      COALESCE(u.display_name, u.email) as name,
      'active' as status,
      u.role,
      jsonb_build_array(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'userRole', cm.role
        )
      ) as companies,
      COALESCE(ns.status, 'not_subscribed') as newsletter_status,
      COALESCE(ns.frequency, '') as newsletter_frequency,
      u.created_at as registration_date,
      u.updated_at as last_activity,
      'users' as source_table,
      u.auth_user_id as user_id,
      NULL::uuid as invitation_id,
      ns.id as newsletter_id,
      NULL::uuid as invitation_token,
      NULL::timestamp with time zone as expires_at,
      cm.role as company_role
    FROM users u
    JOIN company_memberships cm ON cm.user_id = u.auth_user_id
    JOIN companies c ON c.id = cm.company_id
    LEFT JOIN newsletter_subscriptions ns ON ns.email = u.email
    WHERE cm.company_id = p_company_id
    
    UNION ALL
    
    -- Pending invitations for the company
    SELECT 
      ui.email,
      ui.full_name as name,
      CASE 
        WHEN ui.status = 'pending' AND ui.expires_at <= now() THEN 'expired'
        ELSE ui.status
      END as status,
      ui.role,
      jsonb_build_array(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'userRole', 'Member'
        )
      ) as companies,
      COALESCE(ns.status, 'not_subscribed') as newsletter_status,
      COALESCE(ns.frequency, '') as newsletter_frequency,
      ui.created_at as registration_date,
      ui.created_at as last_activity,
      'user_invitations' as source_table,
      NULL::uuid as user_id,
      ui.id as invitation_id,
      ns.id as newsletter_id,
      ui.invitation_token,
      ui.expires_at,
      'Member' as company_role
    FROM user_invitations ui
    LEFT JOIN newsletter_subscriptions ns ON ns.email = ui.email
    LEFT JOIN companies c ON c.id = ui.company_id
    WHERE ui.company_id = p_company_id
    AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = ui.email
    )
  )
  SELECT * FROM company_user_data
  ORDER BY registration_date DESC;
END;
$function$;