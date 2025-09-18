-- Enable company admins to manage user roles within their company scope
-- This adds secure functions and RLS policies for company-scoped user management

-- 1. Function to update user roles within company scope (company admins only)
CREATE OR REPLACE FUNCTION public.update_company_user_role(
  p_user_id uuid,
  p_company_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_target_user_exists boolean := false;
  v_is_company_admin boolean := false;
BEGIN
  -- Validate inputs
  IF p_new_role NOT IN ('Admin', 'Member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role specified');
  END IF;

  -- Check if current user is company admin or global admin
  SELECT EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.user_id = v_current_user_id 
    AND cm.company_id = p_company_id 
    AND cm.role = 'Admin'
  ) OR is_admin() INTO v_is_company_admin;

  IF NOT v_is_company_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Check if target user exists in the company
  SELECT EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.user_id = p_user_id 
    AND cm.company_id = p_company_id
  ) INTO v_target_user_exists;

  IF NOT v_target_user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in company');
  END IF;

  -- Update the user's company role
  UPDATE company_memberships 
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- Log the activity
  PERFORM log_security_event_enhanced(
    'company_user_role_updated',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'company_id', p_company_id,
      'new_role', p_new_role,
      'updated_by', v_current_user_id
    ),
    v_current_user_id,
    'medium'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'company_id', p_company_id,
    'new_role', p_new_role
  );
END;
$$;

-- 2. Function to get company user activity for audit purposes
CREATE OR REPLACE FUNCTION public.get_company_user_activity(
  p_company_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  activity_id uuid,
  user_email text,
  activity_type text,
  activity_description text,
  created_at timestamp with time zone,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only company admins or global admins can access company activity
  IF NOT (is_admin() OR EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.user_id = auth.uid() 
    AND cm.company_id = p_company_id 
    AND cm.role = 'Admin'
  )) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.user_email,
    al.activity_type,
    al.activity_description,
    al.created_at,
    al.metadata
  FROM activity_logs al
  WHERE al.company_id = p_company_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 3. Function to resend company invitation (company admins only)
CREATE OR REPLACE FUNCTION public.resend_company_invitation(
  p_invitation_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_invitation_record user_invitations%ROWTYPE;
  v_is_company_admin boolean := false;
  v_new_token uuid;
  v_new_expires_at timestamptz;
BEGIN
  -- Check if current user is company admin or global admin
  SELECT EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.user_id = v_current_user_id 
    AND cm.company_id = p_company_id 
    AND cm.role = 'Admin'
  ) OR is_admin() INTO v_is_company_admin;

  IF NOT v_is_company_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get the invitation record
  SELECT * INTO v_invitation_record
  FROM user_invitations
  WHERE id = p_invitation_id AND company_id = p_company_id;

  IF v_invitation_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Generate new token and expiry
  v_new_token := gen_random_uuid();
  v_new_expires_at := now() + interval '24 hours';

  -- Update the invitation with new token and expiry
  UPDATE user_invitations 
  SET 
    invitation_token = v_new_token,
    expires_at = v_new_expires_at,
    status = 'pending',
    created_at = now()
  WHERE id = p_invitation_id;

  -- Log the resend activity
  PERFORM log_security_event_enhanced(
    'company_invitation_resent',
    jsonb_build_object(
      'invitation_id', p_invitation_id,
      'company_id', p_company_id,
      'invited_email', v_invitation_record.email,
      'resent_by', v_current_user_id
    ),
    v_current_user_id,
    'low'
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'new_token', v_new_token,
    'expires_at', v_new_expires_at
  );
END;
$$;

-- 4. Add RLS policy to allow company admins to view user profiles for their company members
CREATE POLICY "Company admins can view their company members' profiles"
ON public.users
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM company_memberships cm1
  JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id
  WHERE cm1.user_id = auth.uid() 
  AND cm1.role = 'Admin'
  AND cm2.user_id = users.auth_user_id
));

-- 5. Add RLS policy to allow company admins to manage invitations for their companies
CREATE POLICY "Company admins can manage invitations for their companies"
ON public.user_invitations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
  AND cm.company_id = user_invitations.company_id
  AND cm.role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
  AND cm.company_id = user_invitations.company_id
  AND cm.role = 'Admin'
));

-- 6. Add RLS policy to allow company admins to manage company memberships
CREATE POLICY "Company admins can manage their company memberships"
ON public.company_memberships
FOR ALL
USING (EXISTS (
  SELECT 1 FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
  AND cm.company_id = company_memberships.company_id
  AND cm.role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
  AND cm.company_id = company_memberships.company_id
  AND cm.role = 'Admin'
));