-- 1) Add company_role to invitations
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS company_role text NOT NULL DEFAULT 'Member';

-- 2) Validate company_role in invitation security function
CREATE OR REPLACE FUNCTION public.validate_invitation_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Enforce maximum 24-hour expiry (reduced from 7 days)
  IF NEW.expires_at > (now() + interval '24 hours') THEN
    NEW.expires_at = now() + interval '24 hours';
  END IF;
  
  -- Validate email format
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate role (global)
  IF NEW.role NOT IN ('Admin', 'Client') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Validate company role if provided
  IF NEW.company_role IS NOT NULL AND NEW.company_role NOT IN ('Admin', 'Member') THEN
    RAISE EXCEPTION 'Invalid company role specified';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3) Ensure invitation signup uses company_role for membership
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  -- Best-effort invitation auto-accept. Must never block auth sign up.
  BEGIN
    v_email := NEW.email;

    -- Accept any pending invitation for this email
    UPDATE user_invitations 
    SET status = 'accepted',
        accepted_at = now()
    WHERE lower(email) = lower(v_email)
      AND status = 'pending'
      AND expires_at > now();

    -- Try to upsert users row using invitation details if present
    INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
    SELECT NEW.id, NEW.email, ui.role, ui.client_name, ui.full_name, now(), now()
    FROM user_invitations ui
    WHERE lower(ui.email) = lower(v_email)
      AND ui.status = 'accepted'
    ORDER BY ui.accepted_at DESC
    LIMIT 1
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role = EXCLUDED.role,
      client_name = EXCLUDED.client_name,
      display_name = EXCLUDED.display_name,
      updated_at = now();

    -- Create company membership if invitation specifies company
    INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
    SELECT ui.company_id, NEW.id, COALESCE(ui.company_role, 'Member'), now(), now()
    FROM user_invitations ui
    WHERE lower(ui.email) = lower(v_email)
      AND ui.status = 'accepted'
      AND ui.company_id IS NOT NULL
    ORDER BY ui.accepted_at DESC
    LIMIT 1
    ON CONFLICT (company_id, user_id) DO NOTHING;

  EXCEPTION
    WHEN OTHERS THEN
      PERFORM log_security_event_enhanced(
        'handle_invitation_signup_error',
        jsonb_build_object(
          'email', NEW.email,
          'error', SQLERRM
        ),
        NEW.id,
        'medium'
      );
      -- Do not raise; never block signup.
  END;

  RETURN NEW;
END;
$$;

-- 4) Accept invitation finalize should also honor company_role
CREATE OR REPLACE FUNCTION public.accept_invitation_finalize(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  inv                user_invitations%rowtype;
  v_user_id          uuid := auth.uid();
  v_email            text := lower(coalesce(auth.email(), ''));
  v_company_id       uuid;
  v_slug             text;
  v_now              timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into inv from user_invitations where invitation_token::text = token_input limit 1;
  if inv.id is null then
    return jsonb_build_object('success', false, 'error', 'Invitation not found');
  end if;

  if lower(inv.email) <> v_email then
    return jsonb_build_object('success', false, 'error', 'This invitation is not for the signed-in email');
  end if;

  if inv.status = 'pending' and inv.expires_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'Invitation expired');
  end if;

  update user_invitations set status = 'accepted', accepted_at = coalesce(accepted_at, v_now) where id = inv.id;

  insert into users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
  values (v_user_id, v_email, inv.role, inv.client_name, inv.full_name, v_now, v_now)
  on conflict (auth_user_id) do update
    set role = excluded.role,
        client_name = coalesce(excluded.client_name, users.client_name),
        display_name = coalesce(excluded.display_name, users.display_name),
        updated_at = v_now;

  if inv.company_id is not null then
    v_company_id := inv.company_id;
  elsif inv.client_name is not null and length(trim(inv.client_name)) > 0 then
    v_slug := lower(regexp_replace(trim(inv.client_name), '[^a-z0-9\s-]', '', 'g'));
    v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');

    select id into v_company_id from companies where slug = v_slug or name = inv.client_name limit 1;
    if v_company_id is null then
      insert into companies (name, slug, settings) values (inv.client_name, v_slug, '{}'::jsonb) returning id into v_company_id;
    end if;
  end if;

  if v_company_id is not null then
    insert into company_memberships (company_id, user_id, role, created_at, updated_at)
    select v_company_id, v_user_id, COALESCE(inv.company_role, 'Member'), v_now, v_now
    where not exists (
      select 1 from company_memberships cm where cm.company_id = v_company_id and cm.user_id = v_user_id
    );
  end if;

  perform log_security_event_enhanced(
    'invitation_finalize',
    jsonb_build_object(
      'invitation_id', inv.id,
      'email', v_email,
      'role', inv.role,
      'company_id', v_company_id,
      'company_role', COALESCE(inv.company_role, 'Member'),
      'token_prefix', left(token_input, 8),
      'timestamp', v_now
    ),
    v_user_id,
    'low'
  );

  return jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_email, 'role', inv.role, 'company_id', v_company_id);
end;
$$;

-- 5) Make company admin list reflect invitation company_role for display
CREATE OR REPLACE FUNCTION public.get_company_users_for_admin(p_company_id uuid)
RETURNS TABLE(email text, name text, status text, role text, companies jsonb, newsletter_status text, newsletter_frequency text, registration_date timestamp with time zone, last_activity timestamp with time zone, source_table text, user_id uuid, invitation_id uuid, newsletter_id uuid, invitation_token uuid, expires_at timestamp with time zone, company_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      COALESCE(ui.company_role, 'Member') as company_role
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
$$;