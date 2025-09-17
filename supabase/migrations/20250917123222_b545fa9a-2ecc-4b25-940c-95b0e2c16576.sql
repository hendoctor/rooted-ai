-- Add newsletter frequency and company linking capabilities
ALTER TABLE newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_newsletter_user_id ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_company_id ON newsletter_subscriptions(company_id);

-- Update existing newsletter subscriptions to link users where possible
UPDATE newsletter_subscriptions ns 
SET user_id = u.auth_user_id,
    company_id = (
      SELECT cm.company_id 
      FROM company_memberships cm 
      WHERE cm.user_id = u.auth_user_id 
      LIMIT 1
    )
FROM users u 
WHERE u.email = ns.email 
AND ns.user_id IS NULL;

-- Create function to get user's newsletter preferences
CREATE OR REPLACE FUNCTION public.get_user_newsletter_preferences(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  status text,
  frequency text,
  company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.frequency,
    ns.company_id,
    ns.created_at,
    ns.updated_at
  FROM newsletter_subscriptions ns
  WHERE ns.user_id = p_user_id;
END;
$$;

-- Create function to update newsletter preferences
CREATE OR REPLACE FUNCTION public.update_newsletter_preferences(
  p_user_id uuid,
  p_email text,
  p_status text DEFAULT 'active',
  p_frequency text DEFAULT 'weekly',
  p_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id uuid;
  v_user_email text;
BEGIN
  -- Get user's email for validation
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Validate frequency
  IF p_frequency NOT IN ('daily', 'weekly', 'monthly') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid frequency');
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'unsubscribed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- Insert or update subscription
  INSERT INTO newsletter_subscriptions (user_id, email, status, frequency, company_id)
  VALUES (p_user_id, COALESCE(p_email, v_user_email), p_status, p_frequency, p_company_id)
  ON CONFLICT (email) 
  DO UPDATE SET
    status = EXCLUDED.status,
    frequency = EXCLUDED.frequency,
    company_id = EXCLUDED.company_id,
    user_id = EXCLUDED.user_id,
    updated_at = now()
  RETURNING id INTO v_subscription_id;

  -- Log the newsletter preference change
  PERFORM log_security_event_enhanced(
    'newsletter_preference_updated',
    jsonb_build_object(
      'subscription_id', v_subscription_id,
      'user_id', p_user_id,
      'status', p_status,
      'frequency', p_frequency,
      'company_id', p_company_id
    ),
    p_user_id,
    'low'
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'status', p_status,
    'frequency', p_frequency
  );
END;
$$;

-- Create function for admins to get company newsletter stats
CREATE OR REPLACE FUNCTION public.get_company_newsletter_stats(p_company_id uuid)
RETURNS TABLE(
  total_members bigint,
  subscribed_members bigint,
  daily_subscribers bigint,
  weekly_subscribers bigint,
  monthly_subscribers bigint,
  unsubscribed_members bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin of the company
  IF NOT is_admin() AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = p_company_id 
    AND cm.user_id = auth.uid()
    AND cm.role = 'Admin'
  ) THEN
    -- Return empty results for unauthorized access
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  WITH company_members AS (
    SELECT DISTINCT cm.user_id, u.email
    FROM company_memberships cm
    JOIN users u ON u.auth_user_id = cm.user_id
    WHERE cm.company_id = p_company_id
  ),
  newsletter_stats AS (
    SELECT 
      COUNT(cm.user_id) as total_members,
      COUNT(ns.id) FILTER (WHERE ns.status = 'active') as subscribed_members,
      COUNT(ns.id) FILTER (WHERE ns.status = 'active' AND ns.frequency = 'daily') as daily_subscribers,
      COUNT(ns.id) FILTER (WHERE ns.status = 'active' AND ns.frequency = 'weekly') as weekly_subscribers,
      COUNT(ns.id) FILTER (WHERE ns.status = 'active' AND ns.frequency = 'monthly') as monthly_subscribers,
      COUNT(ns.id) FILTER (WHERE ns.status = 'unsubscribed') as unsubscribed_members
    FROM company_members cm
    LEFT JOIN newsletter_subscriptions ns ON ns.user_id = cm.user_id
  )
  SELECT * FROM newsletter_stats;
END;
$$;

-- Update RLS policies for newsletter_subscriptions
DROP POLICY IF EXISTS "Admins can delete newsletter subscriptions" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can update newsletter subscriptions" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view newsletter subscriptions" ON newsletter_subscriptions;

-- Create new comprehensive RLS policies
CREATE POLICY "Users can manage own newsletter subscription" ON newsletter_subscriptions
FOR ALL 
TO authenticated
USING (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()));

CREATE POLICY "Company admins can manage member subscriptions" ON newsletter_subscriptions
FOR ALL
TO authenticated
USING (
  is_admin() OR 
  (company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = newsletter_subscriptions.company_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'Admin'
  ))
)
WITH CHECK (
  is_admin() OR 
  (company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = newsletter_subscriptions.company_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'Admin'
  ))
);

CREATE POLICY "Global admins can manage all subscriptions" ON newsletter_subscriptions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());