-- Ensure case-insensitive email matching in complete deletion routine
CREATE OR REPLACE FUNCTION public.delete_user_completely_enhanced(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_record users%ROWTYPE;
  deleted_count integer := 0;
  cleanup_summary jsonb := '{}';
BEGIN
  -- Get the user record first (case-insensitive match)
  SELECT * INTO target_user_record
  FROM public.users 
  WHERE lower(email) = lower(user_email)
  LIMIT 1;
  
  IF target_user_record.id IS NULL THEN
    -- If no users row exists, still remove newsletter entries to fully erase access
    DELETE FROM public.newsletter_subscriptions WHERE lower(email) = lower(user_email);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_summary := jsonb_set(cleanup_summary, '{newsletter_deleted}', to_jsonb(deleted_count));

    RETURN jsonb_build_object(
      'success', true,
      'email', user_email,
      'auth_user_id', NULL,
      'cleanup_summary', cleanup_summary
    );
  END IF;

  -- Log the deletion attempt
  PERFORM log_security_event_enhanced(
    'admin_user_deletion_initiated',
    jsonb_build_object(
      'target_email', user_email,
      'target_user_id', target_user_record.auth_user_id,
      'target_role', target_user_record.role,
      'admin_user_id', auth.uid()
    ),
    auth.uid(),
    'high'
  );

  -- 1. Delete company memberships
  DELETE FROM public.company_memberships 
  WHERE user_id = target_user_record.auth_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{company_memberships}', to_jsonb(deleted_count));

  -- 2. Delete activity logs
  DELETE FROM public.activity_logs 
  WHERE user_id = target_user_record.auth_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{activity_logs}', to_jsonb(deleted_count));

  -- 3. Update security audit logs (don't delete for audit trail, but anonymize)
  UPDATE public.security_audit_log 
  SET event_details = jsonb_set(
    COALESCE(event_details, '{}'),
    '{user_deleted}', 
    to_jsonb(true)
  )
  WHERE user_id = target_user_record.auth_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{security_logs_anonymized}', to_jsonb(deleted_count));

  -- 4. Hard delete newsletter subscriptions for this email (case-insensitive)
  DELETE FROM public.newsletter_subscriptions 
  WHERE lower(email) = lower(user_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{newsletter_deleted}', to_jsonb(deleted_count));

  -- 5. Cancel pending invitations (case-insensitive)
  UPDATE public.user_invitations 
  SET status = 'cancelled'
  WHERE lower(email) = lower(user_email) AND status = 'pending';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{invitations_cancelled}', to_jsonb(deleted_count));

  -- 6. Delete from users table (case-insensitive)
  DELETE FROM public.users 
  WHERE lower(email) = lower(user_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  cleanup_summary := jsonb_set(cleanup_summary, '{users_deleted}', to_jsonb(deleted_count));

  -- Log successful cleanup
  PERFORM log_security_event_enhanced(
    'admin_user_deletion_completed',
    jsonb_build_object(
      'target_email', user_email,
      'target_user_id', target_user_record.auth_user_id,
      'cleanup_summary', cleanup_summary,
      'admin_user_id', auth.uid()
    ),
    auth.uid(),
    'high'
  );

  RETURN jsonb_build_object(
    'success', true,
    'email', user_email,
    'auth_user_id', target_user_record.auth_user_id,
    'cleanup_summary', cleanup_summary
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_security_event_enhanced(
      'admin_user_deletion_error',
      jsonb_build_object(
        'target_email', user_email,
        'error', SQLERRM,
        'admin_user_id', auth.uid()
      ),
      auth.uid(),
      'high'
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'email', user_email
    );
END;
$function$;