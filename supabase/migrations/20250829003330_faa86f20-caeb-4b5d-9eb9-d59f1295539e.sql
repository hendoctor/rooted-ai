-- Safely neutralize signup trigger function to never block auth sign-up
-- while keeping best-effort invitation linking. All errors are swallowed and logged.
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;