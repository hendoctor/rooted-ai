-- Create function to remove user from company (company-scoped deletion)
CREATE OR REPLACE FUNCTION public.remove_user_from_company(
  p_user_email text,
  p_company_id uuid,
  p_admin_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_record users%ROWTYPE;
  v_company_name text;
  v_membership_count integer;
  v_cleanup_summary jsonb := '{}';
  v_deleted_count integer := 0;
BEGIN
  -- Only allow company admins or global admins to delete users
  IF NOT (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM company_memberships cm 
      WHERE cm.company_id = p_company_id 
      AND cm.user_id = p_admin_user_id 
      AND cm.role = 'Admin'
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions. Only company admins can remove users.'
    );
  END IF;

  -- Get user record
  SELECT * INTO v_user_record
  FROM users 
  WHERE lower(trim(email)) = lower(trim(p_user_email))
  LIMIT 1;

  IF v_user_record.auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Get company name for logging
  SELECT name INTO v_company_name FROM companies WHERE id = p_company_id;

  -- Log the deletion attempt
  PERFORM log_security_event_enhanced(
    'company_admin_user_removal_initiated',
    jsonb_build_object(
      'target_email', p_user_email,
      'target_user_id', v_user_record.auth_user_id,
      'company_id', p_company_id,
      'company_name', v_company_name,
      'admin_user_id', p_admin_user_id
    ),
    p_admin_user_id,
    'high'
  );

  -- Remove company membership
  DELETE FROM company_memberships 
  WHERE user_id = v_user_record.auth_user_id 
  AND company_id = p_company_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_cleanup_summary := jsonb_set(v_cleanup_summary, '{company_memberships_removed}', to_jsonb(v_deleted_count));

  -- Check if user has any other company memberships
  SELECT COUNT(*) INTO v_membership_count
  FROM company_memberships
  WHERE user_id = v_user_record.auth_user_id;

  -- If user has no other company memberships and is not a global admin, clean up related data
  IF v_membership_count = 0 AND v_user_record.role != 'Admin' THEN
    -- Remove newsletter subscriptions for this company
    DELETE FROM newsletter_subscriptions 
    WHERE user_id = v_user_record.auth_user_id 
    AND company_id = p_company_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_cleanup_summary := jsonb_set(v_cleanup_summary, '{newsletter_subscriptions_removed}', to_jsonb(v_deleted_count));

    -- Cancel any pending invitations for this user's email
    UPDATE user_invitations 
    SET status = 'cancelled'
    WHERE lower(trim(email)) = lower(trim(p_user_email)) 
    AND status = 'pending';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_cleanup_summary := jsonb_set(v_cleanup_summary, '{invitations_cancelled}', to_jsonb(v_deleted_count));
  END IF;

  -- Log successful removal
  PERFORM log_security_event_enhanced(
    'company_admin_user_removal_completed',
    jsonb_build_object(
      'target_email', p_user_email,
      'target_user_id', v_user_record.auth_user_id,
      'company_id', p_company_id,
      'company_name', v_company_name,
      'cleanup_summary', v_cleanup_summary,
      'remaining_memberships', v_membership_count,
      'admin_user_id', p_admin_user_id
    ),
    p_admin_user_id,
    'high'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_email', p_user_email,
    'company_name', v_company_name,
    'remaining_memberships', v_membership_count,
    'cleanup_summary', v_cleanup_summary
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_security_event_enhanced(
      'company_admin_user_removal_error',
      jsonb_build_object(
        'target_email', p_user_email,
        'company_id', p_company_id,
        'error', SQLERRM,
        'admin_user_id', p_admin_user_id
      ),
      p_admin_user_id,
      'high'
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- Update get_company_members_minimal to include newsletter data
CREATE OR REPLACE FUNCTION public.get_company_members_minimal(p_company_id uuid)
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  member_role text, 
  email text, 
  joined_date timestamp with time zone,
  newsletter_status text,
  newsletter_frequency text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow only global Admin or members of the specified company
  IF NOT public.require_role(ARRAY['Admin','Member'], p_company_id) THEN
    -- Not authorized: return empty set
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      u.auth_user_id AS user_id,
      COALESCE(u.display_name, u.email) AS display_name,
      cm.role AS member_role,
      u.email,
      cm.created_at AS joined_date,
      COALESCE(ns.status, 'not_subscribed') AS newsletter_status,
      COALESCE(ns.frequency, '') AS newsletter_frequency
    FROM public.company_memberships cm
    JOIN public.users u ON u.auth_user_id = cm.user_id
    LEFT JOIN public.newsletter_subscriptions ns ON ns.user_id = u.auth_user_id AND ns.company_id = p_company_id
    WHERE cm.company_id = p_company_id
    ORDER BY cm.created_at DESC;
END;
$function$;