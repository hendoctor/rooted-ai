-- Update get_unified_user_data function to include newsletter frequency
CREATE OR REPLACE FUNCTION public.get_unified_user_data()
 RETURNS TABLE(email text, name text, status text, role text, companies jsonb, newsletter_status text, newsletter_frequency text, registration_date timestamp with time zone, last_activity timestamp with time zone, source_table text, user_id uuid, invitation_id uuid, newsletter_id uuid, invitation_token uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this function
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_user_data AS (
    -- Active registered users
    SELECT 
      u.email,
      COALESCE(u.display_name, u.email) as name,
      'active' as status,
      u.role,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'userRole', cm.role
            )
          )
          FROM company_memberships cm
          JOIN companies c ON c.id = cm.company_id
          WHERE cm.user_id = u.auth_user_id
        ),
        '[]'::jsonb
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
      NULL::timestamp with time zone as expires_at
    FROM users u
    LEFT JOIN newsletter_subscriptions ns ON ns.email = u.email
    
    UNION ALL
    
    -- Pending invitations (not yet registered)
    SELECT 
      ui.email,
      ui.full_name as name,
      CASE 
        WHEN ui.status = 'pending' AND ui.expires_at <= now() THEN 'expired'
        ELSE ui.status
      END as status,
      ui.role,
      CASE 
        WHEN ui.client_name IS NOT NULL THEN
          jsonb_build_array(
            jsonb_build_object(
              'id', c.id,
              'name', ui.client_name,
              'slug', c.slug,
              'userRole', 'Member'
            )
          )
        ELSE '[]'::jsonb
      END as companies,
      COALESCE(ns.status, 'not_subscribed') as newsletter_status,
      COALESCE(ns.frequency, '') as newsletter_frequency,
      ui.created_at as registration_date,
      ui.created_at as last_activity,
      'user_invitations' as source_table,
      NULL::uuid as user_id,
      ui.id as invitation_id,
      ns.id as newsletter_id,
      ui.invitation_token,
      ui.expires_at
    FROM user_invitations ui
    LEFT JOIN newsletter_subscriptions ns ON ns.email = ui.email
    LEFT JOIN companies c ON c.name = ui.client_name
    WHERE NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = ui.email
    )
    
    UNION ALL
    
    -- Newsletter-only subscribers (no user account or invitation)
    SELECT 
      ns.email,
      SPLIT_PART(ns.email, '@', 1) as name,
      CASE 
        WHEN ns.status = 'active' THEN 'newsletter_only'
        ELSE 'unsubscribed'
      END as status,
      'Newsletter' as role,
      '[]'::jsonb as companies,
      ns.status as newsletter_status,
      COALESCE(ns.frequency, '') as newsletter_frequency,
      ns.created_at as registration_date,
      ns.updated_at as last_activity,
      'newsletter_subscriptions' as source_table,
      NULL::uuid as user_id,
      NULL::uuid as invitation_id,
      ns.id as newsletter_id,
      NULL::uuid as invitation_token,
      NULL::timestamp with time zone as expires_at
    FROM newsletter_subscriptions ns
    WHERE NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = ns.email
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_invitations ui WHERE ui.email = ns.email
    )
  )
  SELECT * FROM all_user_data
  ORDER BY registration_date DESC;
END;
$function$