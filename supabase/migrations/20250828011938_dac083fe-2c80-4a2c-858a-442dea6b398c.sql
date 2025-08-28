
-- Finalize invitation AFTER the user has a valid Supabase session.
-- This function is idempotent and will:
-- - Verify the invite belongs to the signed-in email
-- - Mark the invite accepted
-- - Upsert the app user record
-- - Ensure the company exists (by company_id or client_name) and create membership if needed
-- - Log a security event
-- Requires the caller to be authenticated.
create or replace function public.accept_invitation_finalize(token_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv                user_invitations%rowtype;
  v_user_id          uuid := auth.uid();
  v_email            text := lower(coalesce(auth.email(), ''));
  v_company_id       uuid;
  v_slug             text;
  v_now              timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Look up the invitation by token (accept both pending and already-accepted records)
  select *
    into inv
  from user_invitations
  where invitation_token::text = token_input
  limit 1;

  if inv.id is null then
    return jsonb_build_object('success', false, 'error', 'Invitation not found');
  end if;

  -- Enforce that the signed-in user matches the invited email
  if lower(inv.email) <> v_email then
    return jsonb_build_object('success', false, 'error', 'This invitation is not for the signed-in email');
  end if;

  -- If still pending, verify it hasn't expired
  if inv.status = 'pending' and inv.expires_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'Invitation expired');
  end if;

  -- Mark accepted (idempotent)
  update user_invitations
     set status = 'accepted',
         accepted_at = coalesce(accepted_at, v_now)
   where id = inv.id;

  -- Upsert app user record
  insert into users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
  values (v_user_id, v_email, inv.role, inv.client_name, inv.full_name, v_now, v_now)
  on conflict (auth_user_id) do update
    set role        = excluded.role,
        client_name = coalesce(excluded.client_name, users.client_name),
        display_name= coalesce(excluded.display_name, users.display_name),
        updated_at  = v_now;

  -- Determine company
  if inv.company_id is not null then
    v_company_id := inv.company_id;
  elsif inv.client_name is not null and length(trim(inv.client_name)) > 0 then
    -- Generate a slug from client_name
    v_slug := lower(regexp_replace(trim(inv.client_name), '[^a-z0-9\\s-]', '', 'g'));
    v_slug := regexp_replace(v_slug, '\\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');

    -- Try to find an existing company by slug or exact name
    select id
      into v_company_id
    from companies
    where slug = v_slug or name = inv.client_name
    limit 1;

    -- Create company if not found
    if v_company_id is null then
      insert into companies (name, slug, settings)
      values (inv.client_name, v_slug, '{}'::jsonb)
      returning id into v_company_id;
    end if;
  end if;

  -- Create membership if we have a company
  if v_company_id is not null then
    -- Insert membership only if it doesn't already exist
    insert into company_memberships (company_id, user_id, role, created_at, updated_at)
    select v_company_id, v_user_id, 'Member', v_now, v_now
    where not exists (
      select 1
      from company_memberships cm
      where cm.company_id = v_company_id
        and cm.user_id = v_user_id
    );
  end if;

  -- Log
  perform log_security_event_enhanced(
    'invitation_finalize',
    jsonb_build_object(
      'invitation_id', inv.id,
      'email', v_email,
      'role', inv.role,
      'company_id', v_company_id,
      'token_prefix', left(token_input, 8),
      'timestamp', v_now
    ),
    v_user_id,
    'low'
  );

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'role', inv.role,
    'company_id', v_company_id
  );
end;
$$;

-- Allow authenticated users to call it
grant execute on function public.accept_invitation_finalize(text) to authenticated;
