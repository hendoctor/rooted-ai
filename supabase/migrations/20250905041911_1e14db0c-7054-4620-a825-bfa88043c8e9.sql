
-- Lock down public inserts: rely on Edge Functions (service role bypasses RLS)
-- Contact form: remove public INSERT path
DROP POLICY IF EXISTS "Allow contact form submissions" ON public.contact_submissions;

-- Newsletter: remove public INSERT path
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;

-- Notes:
-- - Admin policies for newsletter_subscriptions remain, so Admin UI keeps working:
--   "Admins can manage newsletter subscriptions" (ALL) and related policies.
-- - Edge functions use the service role key and bypass RLS, so submissions continue to work.
