-- Fix invalid trigger function that references non-existent columns on certain tables
CREATE OR REPLACE FUNCTION public.invalidate_user_context_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Simplified: avoid referencing NEW.user_id/OLD.user_id which may not exist on all tables
  PERFORM log_security_event(
    'context_cache_invalidated',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the missing ensure_membership_for_current_user RPC
CREATE OR REPLACE FUNCTION public.ensure_membership_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_user_role text;
  v_client_name text;
  v_company_id uuid;
  v_company_slug text;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role, client_name INTO v_user_role, v_client_name
  FROM users 
  WHERE auth_user_id = v_user_id;

  IF v_user_role IS NULL THEN
    SELECT ui.role, ui.client_name
    INTO v_user_role, v_client_name
    FROM user_invitations ui
    WHERE lower(ui.email) = v_email 
      AND ui.status = 'accepted'
    ORDER BY ui.accepted_at DESC
    LIMIT 1;

    v_user_role := COALESCE(v_user_role, 'Client');

    INSERT INTO users (auth_user_id, email, role, client_name, created_at, updated_at)
    VALUES (v_user_id, v_email, v_user_role, v_client_name, v_now, v_now)
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role = EXCLUDED.role,
      client_name = COALESCE(EXCLUDED.client_name, users.client_name),
      updated_at = v_now;
  END IF;

  IF v_user_role = 'Client' THEN
    SELECT c.id, c.slug INTO v_company_id, v_company_slug
    FROM companies c
    JOIN company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = v_user_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      v_client_name := COALESCE(v_client_name, INITCAP(SPLIT_PART(v_email, '@', 2)) || ' Company');
      v_company_slug := lower(regexp_replace(trim(v_client_name), '[^a-z0-9\\s-]', '', 'g'));
      v_company_slug := regexp_replace(v_company_slug, '\\s+', '-', 'g');
      v_company_slug := regexp_replace(v_company_slug, '-+', '-', 'g');
      v_company_slug := trim(v_company_slug, '-');

      SELECT id, slug INTO v_company_id, v_company_slug
      FROM companies
      WHERE slug = v_company_slug OR name = v_client_name
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO companies (name, slug, settings, created_at, updated_at)
        VALUES (v_client_name, v_company_slug, '{}'::jsonb, v_now, v_now)
        RETURNING id, slug INTO v_company_id, v_company_slug;
      END IF;

      INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
      VALUES (v_company_id, v_user_id, 'Member', v_now, v_now)
      ON CONFLICT (company_id, user_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'email', v_email,
      'role', v_user_role,
      'company_id', v_company_id,
      'company_slug', v_company_slug
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'role', v_user_role
  );
END;
$$;

-- Create/replace accept_invitation_finalize RPC (idempotent)
CREATE OR REPLACE FUNCTION public.accept_invitation_finalize(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    v_slug := lower(regexp_replace(trim(inv.client_name), '[^a-z0-9\\s-]', '', 'g'));
    v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');

    select id into v_company_id from companies where slug = v_slug or name = inv.client_name limit 1;
    if v_company_id is null then
      insert into companies (name, slug, settings) values (inv.client_name, v_slug, '{}'::jsonb) returning id into v_company_id;
    end if;
  end if;

  if v_company_id is not null then
    insert into company_memberships (company_id, user_id, role, created_at, updated_at)
    select v_company_id, v_user_id, 'Member', v_now, v_now
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
      'token_prefix', left(token_input, 8),
      'timestamp', v_now
    ),
    v_user_id,
    'low'
  );

  return jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_email, 'role', inv.role, 'company_id', v_company_id);
end;
$$;

-- Backfill for the specific stuck user after fixing the logging trigger function
DO $$
DECLARE
  v_auth_user_id uuid;
  v_company_id uuid;
  v_inv user_invitations%ROWTYPE;
BEGIN
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = 'testy@hennahane.com';
  IF v_auth_user_id IS NULL THEN
    RETURN; -- Auth user not present; nothing to backfill
  END IF;

  SELECT * INTO v_inv FROM user_invitations WHERE email = 'testy@hennahane.com' ORDER BY created_at DESC LIMIT 1;

  IF v_inv.id IS NOT NULL THEN
    UPDATE user_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
    VALUES (v_auth_user_id, v_inv.email, v_inv.role, v_inv.client_name, v_inv.full_name, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role = EXCLUDED.role,
      client_name = EXCLUDED.client_name,
      display_name = EXCLUDED.display_name,
      updated_at = now();

    SELECT id INTO v_company_id FROM companies WHERE name = 'Testyhenn' OR slug = 'henntest' LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
      VALUES (v_company_id, v_auth_user_id, 'Member', now(), now())
      ON CONFLICT (company_id, user_id) DO NOTHING;
    END IF;
  END IF;
END $$;