-- Fix critical security issues in RLS policies

-- 1. Restrict role_permissions table access to authenticated users only
DROP POLICY IF EXISTS "Allow read role permissions" ON public.role_permissions;

CREATE POLICY "Authenticated users can read role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix conflicting users table RLS policies - remove the conflicting policy
DROP POLICY IF EXISTS "Users cannot update their own role" ON public.users;

-- Keep only the policy that allows admins to manage users and users to view their own data
-- The admin policy already handles role updates properly

-- 3. Update OTP expiry settings by creating a trigger to enforce shorter expiry
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to user_invitations table
DROP TRIGGER IF EXISTS enforce_invitation_expiry ON public.user_invitations;
CREATE TRIGGER enforce_invitation_expiry
  BEFORE INSERT OR UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_otp_expiry();

-- 4. Add enhanced security logging for role changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply role change logging trigger
DROP TRIGGER IF EXISTS log_user_role_changes ON public.users;
CREATE TRIGGER log_user_role_changes
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();