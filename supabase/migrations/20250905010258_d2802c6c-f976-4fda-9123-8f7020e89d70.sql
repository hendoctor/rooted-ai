-- Step 1: Create the missing ensure_membership_for_current_user RPC function
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
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get or create user record
  SELECT role, client_name INTO v_user_role, v_client_name
  FROM users 
  WHERE auth_user_id = v_user_id;

  -- If no user record exists, create one
  IF v_user_role IS NULL THEN
    -- Check for accepted invitation to get role and client_name
    SELECT ui.role, ui.client_name
    INTO v_user_role, v_client_name
    FROM user_invitations ui
    WHERE lower(ui.email) = v_email 
      AND ui.status = 'accepted'
    ORDER BY ui.accepted_at DESC
    LIMIT 1;

    -- Default to Client role if no invitation found
    v_user_role := COALESCE(v_user_role, 'Client');

    -- Insert user record
    INSERT INTO users (auth_user_id, email, role, client_name, created_at, updated_at)
    VALUES (v_user_id, v_email, v_user_role, v_client_name, v_now, v_now)
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role = EXCLUDED.role,
      client_name = COALESCE(EXCLUDED.client_name, users.client_name),
      updated_at = v_now;
  END IF;

  -- For Client role users, ensure company membership
  IF v_user_role = 'Client' THEN
    -- Check if user already has company membership
    SELECT c.id, c.slug INTO v_company_id, v_company_slug
    FROM companies c
    JOIN company_memberships cm ON cm.company_id = c.id
    WHERE cm.user_id = v_user_id
    LIMIT 1;

    -- If no membership exists, create company and membership
    IF v_company_id IS NULL THEN
      -- Use client_name or derive from email
      v_client_name := COALESCE(v_client_name, 
        INITCAP(SPLIT_PART(v_email, '@', 2)) || ' Company');
      
      -- Generate slug
      v_company_slug := lower(regexp_replace(trim(v_client_name), '[^a-z0-9\\s-]', '', 'g'));
      v_company_slug := regexp_replace(v_company_slug, '\\s+', '-', 'g');
      v_company_slug := regexp_replace(v_company_slug, '-+', '-', 'g');
      v_company_slug := trim(v_company_slug, '-');

      -- Find or create company
      SELECT id, slug INTO v_company_id, v_company_slug
      FROM companies
      WHERE slug = v_company_slug OR name = v_client_name
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO companies (name, slug, settings, created_at, updated_at)
        VALUES (v_client_name, v_company_slug, '{}'::jsonb, v_now, v_now)
        RETURNING id, slug INTO v_company_id, v_company_slug;
      END IF;

      -- Create membership
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

  -- For Admin users, just return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'role', v_user_role
  );
END;
$$;

-- Step 2: Create accept_invitation_finalize RPC function
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

  -- Look up the invitation by token (accept both pending and already-accepted records)
  select *
    into inv
  from user_invitations
  where invitation_token::text = token_input
  limit 1;

  if inv.id is null then
    return jsonb_build_object('success', false, 'error', 'Invitation not found');
  end if;

  -- Enforce that the signed-in user matches the invited email
  if lower(inv.email) <> v_email then
    return jsonb_build_object('success', false, 'error', 'This invitation is not for the signed-in email');
  end if;

  -- If still pending, verify it hasn't expired
  if inv.status = 'pending' and inv.expires_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'Invitation expired');
  end if;

  -- Mark accepted (idempotent)
  update user_invitations
     set status = 'accepted',
         accepted_at = coalesce(accepted_at, v_now)
   where id = inv.id;

  -- Upsert app user record
  insert into users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
  values (v_user_id, v_email, inv.role, inv.client_name, inv.full_name, v_now, v_now)
  on conflict (auth_user_id) do update
    set role        = excluded.role,
        client_name = coalesce(excluded.client_name, users.client_name),
        display_name= coalesce(excluded.display_name, users.display_name),
        updated_at  = v_now;

  -- Determine company
  if inv.company_id is not null then
    v_company_id := inv.company_id;
  elsif inv.client_name is not null and length(trim(inv.client_name)) > 0 then
    -- Generate a slug from client_name
    v_slug := lower(regexp_replace(trim(inv.client_name), '[^a-z0-9\\s-]', '', 'g'));
    v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');

    -- Try to find an existing company by slug or exact name
    select id
      into v_company_id
    from companies
    where slug = v_slug or name = inv.client_name
    limit 1;

    -- Create company if not found
    if v_company_id is null then
      insert into companies (name, slug, settings)
      values (inv.client_name, v_slug, '{}'::jsonb)
      returning id into v_company_id;
    end if;
  end if;

  -- Create membership if we have a company
  if v_company_id is not null then
    -- Insert membership only if it doesn't already exist
    insert into company_memberships (company_id, user_id, role, created_at, updated_at)
    select v_company_id, v_user_id, 'Member', v_now, v_now
    where not exists (
      select 1
      from company_memberships cm
      where cm.company_id = v_company_id
        and cm.user_id = v_user_id
    );
  end if;

  -- Log
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

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'role', inv.role,
    'company_id', v_company_id
  );
end;
$$;

-- Step 3: Improve the handle_invitation_signup trigger
DROP TRIGGER IF EXISTS handle_invitation_signup_trigger ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    SELECT ui.company_id, NEW.id, 'Member', now(), now()
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

-- Re-create the trigger
CREATE TRIGGER handle_invitation_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_signup();

-- Step 4: Add unique constraint to company_memberships if it doesn't exist
DO $$
BEGIN
  -- Try to add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'company_memberships_company_id_user_id_key'
  ) THEN
    ALTER TABLE company_memberships 
    ADD CONSTRAINT company_memberships_company_id_user_id_key 
    UNIQUE (company_id, user_id);
  END IF;
END $$;

-- Step 5: Backfill missing data for testy@hennahane.com
DO $$
DECLARE
  v_auth_user_id uuid;
  v_company_id uuid;
  v_invitation_record user_invitations%ROWTYPE;
BEGIN
  -- Find the auth user ID for testy@hennahane.com
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'testy@hennahane.com';

  IF v_auth_user_id IS NOT NULL THEN
    -- Get the invitation record
    SELECT * INTO v_invitation_record
    FROM user_invitations
    WHERE email = 'testy@hennahane.com'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invitation_record.id IS NOT NULL THEN
      -- Accept the invitation
      UPDATE user_invitations
      SET status = 'accepted',
          accepted_at = now()
      WHERE id = v_invitation_record.id;

      -- Create or update user record
      INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
      VALUES (
        v_auth_user_id, 
        'testy@hennahane.com', 
        v_invitation_record.role, 
        v_invitation_record.client_name,
        v_invitation_record.full_name,
        now(), 
        now()
      )
      ON CONFLICT (auth_user_id) DO UPDATE SET
        role = EXCLUDED.role,
        client_name = EXCLUDED.client_name,
        display_name = EXCLUDED.display_name,
        updated_at = now();

      -- Get the company ID (should be Testyhenn)
      SELECT id INTO v_company_id
      FROM companies
      WHERE name = 'Testyhenn' OR slug = 'henntest'
      LIMIT 1;

      -- Create company membership if company exists
      IF v_company_id IS NOT NULL THEN
        INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
        VALUES (v_company_id, v_auth_user_id, 'Member', now(), now())
        ON CONFLICT (company_id, user_id) DO NOTHING;
      END IF;

      -- Log the fix
      PERFORM log_security_event_enhanced(
        'backfill_client_fix',
        jsonb_build_object(
          'email', 'testy@hennahane.com',
          'user_id', v_auth_user_id,
          'company_id', v_company_id,
          'invitation_id', v_invitation_record.id
        ),
        v_auth_user_id,
        'low'
      );
    END IF;
  END IF;
END $$;