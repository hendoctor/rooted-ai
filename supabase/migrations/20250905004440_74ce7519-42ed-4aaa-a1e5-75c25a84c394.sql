
-- 1) Ensure we don't create duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS company_memberships_company_user_unique
ON public.company_memberships (company_id, user_id);

-- 2) Create a robust RPC that guarantees a company + membership for the current user
-- Returns { success, company_id, company_slug, created_company, created_membership }
CREATE OR REPLACE FUNCTION public.ensure_membership_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_email        text := lower(coalesce(auth.email(), ''));
  v_user         public.users%rowtype;
  v_company_id   uuid;
  v_client_name  text;
  v_slug         text;
  v_created_company boolean := false;
  v_created_membership boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Upsert minimal users row if missing (default role Client if unknown)
  SELECT * INTO v_user
  FROM public.users
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_user.auth_user_id IS NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, created_at, updated_at)
    VALUES (v_user_id, v_email, 'Client', now(), now())
    RETURNING * INTO v_user;
  ELSIF v_user.email IS DISTINCT FROM v_email AND v_email <> '' THEN
    UPDATE public.users
       SET email = v_email,
           updated_at = now()
     WHERE auth_user_id = v_user_id
    RETURNING * INTO v_user;
  END IF;

  -- If user already has a membership, return the first company
  SELECT cm.company_id INTO v_company_id
  FROM public.company_memberships cm
  WHERE cm.user_id = v_user_id
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    RETURN (
      SELECT jsonb_build_object(
        'success', true,
        'company_id', c.id,
        'company_slug', c.slug,
        'created_company', false,
        'created_membership', false
      )
      FROM public.companies c
      WHERE c.id = v_company_id
    );
  END IF;

  -- Determine client name to derive company
  v_client_name := COALESCE(
    NULLIF(trim(v_user.client_name), ''),
    INITCAP(split_part(v_email, '@', 2)) || ' Company'
  );

  -- Generate slug from client name
  v_slug := lower(regexp_replace(trim(v_client_name), '[^a-z0-9\\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(v_slug, '-');

  -- Find or create company
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = v_slug OR name = v_client_name
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, slug, settings, created_at, updated_at)
    VALUES (v_client_name, v_slug, '{}'::jsonb, now(), now())
    RETURNING id INTO v_company_id;
    v_created_company := true;
  END IF;

  -- Create membership
  INSERT INTO public.company_memberships (company_id, user_id, role, created_at, updated_at)
  VALUES (v_company_id, v_user_id, 'Member', now(), now())
  ON CONFLICT (company_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_created_membership = ROW_COUNT > 0;

  RETURN (
    SELECT jsonb_build_object(
      'success', true,
      'company_id', c.id,
      'company_slug', c.slug,
      'created_company', v_created_company,
      'created_membership', v_created_membership
    )
    FROM public.companies c
    WHERE c.id = v_company_id
  );
END;
$$;

-- 3) Hook up the existing ensure_client_company_membership() function via triggers on public.users

-- Drop if they exist to avoid duplicates
DROP TRIGGER IF EXISTS ensure_client_company_membership_after_insert ON public.users;
DROP TRIGGER IF EXISTS ensure_client_company_membership_after_update ON public.users;

-- After insert: auto-create company + membership for Client users with no membership
CREATE TRIGGER ensure_client_company_membership_after_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_client_company_membership();

-- After role update: if a user becomes a Client, ensure they have a membership
CREATE TRIGGER ensure_client_company_membership_after_update
AFTER UPDATE OF role ON public.users
FOR EACH ROW
WHEN (NEW.role = 'Client')
EXECUTE FUNCTION public.ensure_client_company_membership();

-- 4) Backfill: create companies + memberships for any existing Client users with none
DO $$
DECLARE
  r RECORD;
  v_company_id uuid;
  v_client_name text;
  v_slug text;
BEGIN
  FOR r IN
    SELECT u.auth_user_id, u.email, u.client_name
    FROM public.users u
    WHERE u.role = 'Client'
      AND NOT EXISTS (
        SELECT 1
        FROM public.company_memberships cm
        WHERE cm.user_id = u.auth_user_id
      )
  LOOP
    v_client_name := COALESCE(
      NULLIF(trim(r.client_name), ''),
      INITCAP(split_part(r.email, '@', 2)) || ' Company'
    );

    v_slug := lower(regexp_replace(trim(v_client_name), '[^a-z0-9\\s-]', '', 'g'));
    v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');
    v_slug := trim(v_slug, '-');

    SELECT id INTO v_company_id
    FROM public.companies
    WHERE slug = v_slug OR name = v_client_name
    LIMIT 1;

    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (name, slug, settings, created_at, updated_at)
      VALUES (v_client_name, v_slug, '{}'::jsonb, now(), now())
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.company_memberships (company_id, user_id, role, created_at, updated_at)
    VALUES (v_company_id, r.auth_user_id, 'Member', now(), now())
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END LOOP;
END $$;
