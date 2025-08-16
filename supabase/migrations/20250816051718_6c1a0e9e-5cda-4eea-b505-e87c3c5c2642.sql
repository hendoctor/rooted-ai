-- Harden RLS for contact_submissions to prevent public reads
-- 1) Ensure RLS is enabled
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 2) Remove any potential permissive public read policies by common names (no-op if absent)
DROP POLICY IF EXISTS "Public can read contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Allow public read contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_read_all" ON public.contact_submissions;

-- 3) Ensure INSERT is allowed for public submissions (needed for public contact form)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'contact_submissions' 
      AND polname = 'Allow contact form submissions'
  ) THEN
    CREATE POLICY "Allow contact form submissions"
    ON public.contact_submissions
    FOR INSERT
    WITH CHECK (true);
  END IF;
END$$;

-- 4) Restrict SELECT strictly to Admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'contact_submissions' 
      AND polname = 'Admins can view contact submissions'
  ) THEN
    CREATE POLICY "Admins can view contact submissions"
    ON public.contact_submissions
    FOR SELECT
    USING (public.get_current_user_role() = 'Admin');
  END IF;
END$$;