-- Tighten invitation visibility: remove public token-based access
-- Keep admin access; rely on secure RPC validate_invitation_secure for token validation

-- 1) Drop insecure token-based SELECT policy
DROP POLICY IF EXISTS "Token-based invitation access only" ON public.user_invitations;

-- 2) Optional safeguard: ensure no other broad SELECT policies exist beyond admin
-- (Admin policies already exist; no change needed)

-- 3) (Optional) Allow authenticated invited users to view their own invitations only
-- This does not help anonymous flows, but is safe for signed-in cases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_invitations' 
      AND policyname = 'Invited user can view own invitations'
  ) THEN
    CREATE POLICY "Invited user can view own invitations"
      ON public.user_invitations
      FOR SELECT
      TO authenticated
      USING (
        lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      );
  END IF;
END $$;