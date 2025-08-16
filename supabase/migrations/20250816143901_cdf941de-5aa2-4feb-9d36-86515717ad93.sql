-- Ensure strong read protection for contact_submissions

-- 1) Explicitly enable RLS (idempotent)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 2) Replace any existing SELECT policy with a strict Admin-only policy
DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Only admins can view contact submissions" ON public.contact_submissions;

CREATE POLICY "Only admins can view contact submissions"
ON public.contact_submissions
FOR SELECT
USING (public.get_current_user_role() = 'Admin');

-- 3) Keep insert open for contact form submissions (idempotent create)
DROP POLICY IF EXISTS "Allow contact form submissions" ON public.contact_submissions;
CREATE POLICY "Allow contact form submissions"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- 4) Deny UPDATE/DELETE by omission (no policies needed).