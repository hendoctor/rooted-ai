-- Allow company admins to insert notifications for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Company admins can insert notifications'
  ) THEN
    CREATE POLICY "Company admins can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
      is_admin() OR EXISTS (
        SELECT 1 
        FROM public.company_memberships cm
        WHERE cm.company_id = notifications.company_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'Admin'
      )
    );
  END IF;
END $$;