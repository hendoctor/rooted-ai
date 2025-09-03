-- Ensure clients without invitations get a company portal
-- Create a function to auto-create company for new client users without one

CREATE OR REPLACE FUNCTION public.ensure_client_company_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_client_name text;
  v_slug text;
BEGIN
  -- Only process Client role users
  IF NEW.role != 'Client' THEN
    RETURN NEW;
  END IF;

  -- Check if user already has company memberships
  IF EXISTS (
    SELECT 1 FROM company_memberships 
    WHERE user_id = NEW.auth_user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Try to use client_name if available, otherwise derive from email
  v_client_name := COALESCE(NEW.client_name, 
    INITCAP(SPLIT_PART(NEW.email, '@', 2)) || ' Company');
  
  -- Generate slug from client name
  v_slug := lower(regexp_replace(trim(v_client_name), '[^a-z0-9\\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(v_slug, '-');

  -- Try to find existing company by slug or name
  SELECT id INTO v_company_id
  FROM companies
  WHERE slug = v_slug OR name = v_client_name
  LIMIT 1;

  -- Create company if not found
  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, slug, settings, created_at, updated_at)
    VALUES (v_client_name, v_slug, '{}'::jsonb, now(), now())
    RETURNING id INTO v_company_id;
  END IF;

  -- Create company membership
  INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
  VALUES (v_company_id, NEW.auth_user_id, 'Member', now(), now())
  ON CONFLICT (company_id, user_id) DO NOTHING;

  -- Log the auto-creation
  PERFORM log_security_event_enhanced(
    'auto_company_creation',
    jsonb_build_object(
      'user_id', NEW.auth_user_id,
      'email', NEW.email,
      'company_id', v_company_id,
      'company_name', v_client_name,
      'company_slug', v_slug
    ),
    NEW.auth_user_id,
    'low'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the user creation
    PERFORM log_security_event_enhanced(
      'auto_company_creation_error',
      jsonb_build_object(
        'user_id', NEW.auth_user_id,
        'email', NEW.email,
        'error', SQLERRM
      ),
      NEW.auth_user_id,
      'medium'
    );
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create company memberships for new client users
CREATE OR REPLACE TRIGGER ensure_client_company_membership_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_client_company_membership();