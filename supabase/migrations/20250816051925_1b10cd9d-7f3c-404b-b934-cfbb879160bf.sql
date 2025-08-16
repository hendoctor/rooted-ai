-- Strengthen RLS for user_invitations: allow SELECT only to Admins and invited user (by email)
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Remove any permissive public read policies if they exist (no-op if absent)
DROP POLICY IF EXISTS "Public can read invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Allow public read invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_read_all" ON public.user_invitations;

-- Explicit SELECT policy for Admins (even if an ALL policy exists, this is clear and future-proof)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_invitations' 
      AND policyname = 'Admins can view all invitations'
  ) THEN
    CREATE POLICY "Admins can view all invitations"
    ON public.user_invitations
    FOR SELECT
    USING (public.get_current_user_role() = 'Admin');
  END IF;
END$$;

-- Allow invited users (authenticated) to view ONLY their own pending invitation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_invitations' 
      AND policyname = 'Invited user can view own pending invitation'
  ) THEN
    CREATE POLICY "Invited user can view own pending invitation"
    ON public.user_invitations
    FOR SELECT
    USING (auth.email() = email AND status = 'pending');
  END IF;
END$$;