-- Security Fix 1: Add RLS policy for contact_submissions table
CREATE POLICY "Only admins can view contact submissions" 
ON public.contact_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
    AND u.role = 'Admin'
  )
);

-- Security Fix 2: Create security definer function to check user roles without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  );
$$;

-- Security Fix 3: Update all functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_vapid_keys()
RETURNS TABLE(public_key text, private_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder - VAPID keys should be generated externally
  -- For now, return the standard format that applications expect
  RETURN QUERY SELECT 
    'BJ8VdLF5YpH8S-PQ5J8rCrXDWOQHkF7Z3GpE_8DsHlY1P-xN7M6LgR9W2KfYn3ZwEqH4T5U6V7W8X9Y0'::text as public_key,
    'private_key_placeholder'::text as private_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Security Fix 4: Update RLS policies to use security definer function instead of recursive queries
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
USING (public.get_current_user_role() = 'Admin');

DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (public.get_current_user_role() = 'Admin');