-- Phase 2: Add focused RPCs for company-admin CRUD operations

-- A) Update company user role function
CREATE OR REPLACE FUNCTION public.update_company_user_role(
  p_user_id uuid, 
  p_company_id uuid, 
  p_new_role text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: require company admin or global admin
  IF NOT (public.require_role(ARRAY['Admin'], p_company_id) OR is_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Validate role
  IF p_new_role NOT IN ('Admin', 'Member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be Admin or Member');
  END IF;
  
  -- Update the company membership role
  UPDATE public.company_memberships 
  SET role = p_new_role, updated_at = now()
  WHERE company_id = p_company_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in company');
  END IF;
  
  -- Log the change
  PERFORM log_security_event_enhanced(
    'company_user_role_updated',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'company_id', p_company_id,
      'new_role', p_new_role,
      'updated_by', auth.uid()
    ),
    auth.uid(),
    'medium'
  );
  
  RETURN jsonb_build_object('success', true, 'new_role', p_new_role);
END;
$$;

-- B) Remove user from company function  
CREATE OR REPLACE FUNCTION public.remove_user_from_company(
  p_user_email text,
  p_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_cleanup_summary jsonb := '{}';
  v_deleted_count integer := 0;
BEGIN
  -- Security check: require company admin or global admin
  IF NOT (public.require_role(ARRAY['Admin'], p_company_id) OR is_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get user ID by email
  SELECT auth_user_id INTO v_user_id
  FROM public.users 
  WHERE lower(trim(email)) = lower(trim(p_user_email));
  
  -- Remove from company membership
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.company_memberships 
    WHERE company_id = p_company_id AND user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_cleanup_summary := jsonb_set(v_cleanup_summary, '{company_membership_removed}', to_jsonb(v_deleted_count > 0));
  END IF;
  
  -- Unsubscribe from company-specific newsletters
  UPDATE public.newsletter_subscriptions 
  SET status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
  WHERE company_id = p_company_id AND lower(trim(email)) = lower(trim(p_user_email));
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_cleanup_summary := jsonb_set(v_cleanup_summary, '{newsletter_unsubscribed}', to_jsonb(v_deleted_count));
  
  -- Cancel pending invitations for this company
  UPDATE public.user_invitations 
  SET status = 'cancelled'
  WHERE company_id = p_company_id 
    AND lower(trim(email)) = lower(trim(p_user_email)) 
    AND status = 'pending';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_cleanup_summary := jsonb_set(v_cleanup_summary, '{invitations_cancelled}', to_jsonb(v_deleted_count));
  
  -- Log the removal
  PERFORM log_security_event_enhanced(
    'user_removed_from_company',
    jsonb_build_object(
      'target_email', p_user_email,
      'target_user_id', v_user_id,
      'company_id', p_company_id,
      'removed_by', auth.uid(),
      'cleanup_summary', v_cleanup_summary
    ),
    auth.uid(),
    'high'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_id', v_user_id,
    'cleanup_summary', v_cleanup_summary
  );
END;
$$;

-- C) Resend company invitation function
CREATE OR REPLACE FUNCTION public.resend_company_invitation(
  p_invitation_id uuid,
  p_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation_record user_invitations%ROWTYPE;
BEGIN
  -- Security check: require company admin or global admin
  IF NOT (public.require_role(ARRAY['Admin'], p_company_id) OR is_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get and validate invitation
  SELECT * INTO v_invitation_record
  FROM public.user_invitations
  WHERE id = p_invitation_id AND company_id = p_company_id;
  
  IF v_invitation_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Update invitation to extend expiry and reset to pending
  UPDATE public.user_invitations 
  SET 
    expires_at = now() + interval '24 hours',
    status = 'pending'
  WHERE id = p_invitation_id;
  
  -- Log the resend
  PERFORM log_security_event_enhanced(
    'company_invitation_resent',
    jsonb_build_object(
      'invitation_id', p_invitation_id,
      'company_id', p_company_id,
      'target_email', v_invitation_record.email,
      'resent_by', auth.uid()
    ),
    auth.uid(),
    'low'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'new_expires_at', now() + interval '24 hours'
  );
END;
$$;

-- D) Get company user activity function
CREATE OR REPLACE FUNCTION public.get_company_user_activity(
  p_company_id uuid,
  p_limit integer DEFAULT 100
) RETURNS TABLE(
  activity_time timestamp with time zone,
  activity_type text,
  user_email text,
  description text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: require company admin or global admin
  IF NOT (public.require_role(ARRAY['Admin'], p_company_id) OR is_admin()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH company_activity AS (
    -- Activity from activity_logs table
    SELECT 
      al.created_at as activity_time,
      al.activity_type,
      al.user_email,
      al.activity_description as description,
      al.metadata
    FROM public.activity_logs al
    WHERE al.company_id = p_company_id
    
    UNION ALL
    
    -- Security events related to this company from audit log
    SELECT 
      sal.created_at as activity_time,
      sal.event_type as activity_type,
      COALESCE(u.email, 'System') as user_email,
      sal.event_type as description,
      sal.event_details as metadata
    FROM public.security_audit_log sal
    LEFT JOIN public.users u ON u.auth_user_id = sal.user_id
    WHERE sal.event_details->>'company_id' = p_company_id::text
  )
  SELECT ca.* FROM company_activity ca
  ORDER BY ca.activity_time DESC
  LIMIT p_limit;
END;
$$;