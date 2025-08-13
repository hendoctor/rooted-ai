-- Fix remaining security warnings

-- 1. Fix function search path for the new functions
CREATE OR REPLACE FUNCTION public.enforce_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is related to OTP/invitation tokens, ensure reasonable expiry
  IF TG_TABLE_NAME = 'user_invitations' THEN
    -- Limit invitation expiry to maximum 24 hours instead of 7 days
    IF NEW.expires_at > (now() + interval '24 hours') THEN
      NEW.expires_at = now() + interval '24 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes for security audit
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM log_security_event(
      'role_change',
      jsonb_build_object(
        'user_email', NEW.email,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.email()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';