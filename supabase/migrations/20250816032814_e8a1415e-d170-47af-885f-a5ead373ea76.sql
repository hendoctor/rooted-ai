-- Fix the ambiguous column reference in get_user_role_by_auth_id function
CREATE OR REPLACE FUNCTION public.get_user_role_by_auth_id(auth_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'role', u.role,
      'client_name', u.client_name,
      'email', u.email
    )
    FROM public.users u
    WHERE u.auth_user_id = get_user_role_by_auth_id.auth_user_id
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
$function$