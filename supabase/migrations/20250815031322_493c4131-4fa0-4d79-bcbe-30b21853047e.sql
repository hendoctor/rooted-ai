-- Add indexes for faster role lookups and optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Add optimized function for role lookup with better error handling
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'role', role,
      'client_name', client_name,
      'email', email
    )
    FROM public.users 
    WHERE email = user_email
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'role', 'Client',
      'client_name', null,
      'email', user_email,
      'error', SQLERRM
    );
END;
$$;

-- Add function for auth user ID lookup as backup
CREATE OR REPLACE FUNCTION public.get_user_role_by_auth_id(auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'role', role,
      'client_name', client_name,
      'email', email
    )
    FROM public.users 
    WHERE auth_user_id = auth_user_id
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'role', 'Client',
      'client_name', null,
      'email', null,
      'error', SQLERRM
    );
END;
$$;