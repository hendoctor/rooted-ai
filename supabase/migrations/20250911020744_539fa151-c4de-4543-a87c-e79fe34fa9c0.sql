-- Enable RLS and restrict access on policy_access_metrics
ALTER TABLE public.policy_access_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'policy_access_metrics' AND policyname = 'Admins can view policy access metrics'
  ) THEN
    CREATE POLICY "Admins can view policy access metrics"
    ON public.policy_access_metrics
    FOR SELECT
    USING (get_current_user_role() = 'Admin');
  END IF;
END $$;
