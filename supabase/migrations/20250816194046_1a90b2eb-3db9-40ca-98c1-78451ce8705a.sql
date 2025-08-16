-- Secure newsletter_subscriptions: explicit SELECT policy for admins only
DO $$
BEGIN
  -- Ensure RLS is enabled (idempotent)
  EXECUTE 'ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY';

  -- Add explicit SELECT policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscriptions' 
      AND policyname = 'Admins can view newsletter subscriptions'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view newsletter subscriptions" 
      ON public.newsletter_subscriptions 
      FOR SELECT 
      USING (is_admin())';
  END IF;

  -- Keep public insert (subscription) capability; create if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscriptions' 
      AND policyname = 'Anyone can subscribe to newsletter'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can subscribe to newsletter" 
      ON public.newsletter_subscriptions 
      FOR INSERT 
      WITH CHECK (true)';
  END IF;

  -- Ensure update/delete are admin-only (idempotent add separate policies)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscriptions' 
      AND policyname = 'Admins can update newsletter subscriptions'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update newsletter subscriptions" 
      ON public.newsletter_subscriptions 
      FOR UPDATE 
      USING (is_admin()) 
      WITH CHECK (is_admin())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscriptions' 
      AND policyname = 'Admins can delete newsletter subscriptions'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete newsletter subscriptions" 
      ON public.newsletter_subscriptions 
      FOR DELETE 
      USING (is_admin())';
  END IF;
END $$;