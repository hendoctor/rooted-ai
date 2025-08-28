
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptInvitationRequest {
  invitation_token: string;
  password: string;
}

// Helper: find auth user by email using Admin API (fallback for partial failures)
async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
  maxPages = 5,
  perPage = 200
) {
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn('listUsers error:', error);
      break;
    }
    const match = data?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (!data || data.users?.length < perPage) break; // no more pages
  }
  return null;
}

// Helper: create or link company membership idempotently
async function upsertMembership(
  supabaseAdmin: ReturnType<typeof createClient>,
  companyId: string,
  userId: string
) {
  const { error } = await supabaseAdmin
    .from('company_memberships')
    .upsert(
      {
        company_id: companyId,
        user_id: userId,
        role: 'Member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'company_id,user_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Failed to upsert company membership:', error);
  }
}

// Helper: ensure company exists from name and return id (creates if missing)
async function ensureCompanyFromName(
  supabaseAdmin: ReturnType<typeof createClient>,
  clientName: string
): Promise<string | null> {
  try {
    const slug = clientName
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Try to find existing by slug or name
    const { data: existingCompany, error: findErr } = await supabaseAdmin
      .from('companies')
      .select('id')
      .or(`slug.eq.${slug},name.eq.${clientName}`)
      .maybeSingle();

    if (findErr) {
      console.warn('Company lookup warning:', findErr.message || findErr);
    }

    if (existingCompany?.id) return existingCompany.id;

    // Create if missing
    const { data: createdCompany, error: createErr } = await supabaseAdmin
      .from('companies')
      .insert({ name: clientName, slug, settings: {} })
      .select('id')
      .single();

    if (createErr) {
      console.error('Failed to create company:', createErr);
      return null;
    }

    return createdCompany.id as string;
  } catch (e) {
    console.error('ensureCompanyFromName error:', e);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { invitation_token, password }: AcceptInvitationRequest = await req.json();

    console.log(`Processing invitation acceptance for token: ${invitation_token.substring(0, 8)}...`);

    // Validate invitation token using admin client
    const { data: invitationData, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', invitation_token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitationData) {
      console.error('Invalid invitation token:', invitationError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired invitation token',
          details: invitationError?.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const normalizedEmail = String(invitationData.email || '').toLowerCase();
    console.log('Valid invitation found:', normalizedEmail);

    // Try create user with admin API (bypasses email confirmation)
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invitationData.full_name,
        role: invitationData.role,
        client_name: invitationData.client_name,
        invitation_id: invitationData.id
      }
    });

    let authUserId: string | null = newUserData?.user?.id ?? null;
    let treatAsExisting = false;

    if (createUserError || !authUserId) {
      const msg = (createUserError as any)?.message || '';
      const status = (createUserError as any)?.status;
      console.error('createUser error/status:', status, msg);

      // Known duplicate cases or already-registered address
      if (status === 422 || /already exists|already registered|User already/i.test(msg)) {
        treatAsExisting = true;
      } else if (status === 500) {
        // Transient "Database error creating new user" (e.g., legacy triggers): try to find the user by email
        console.warn('500 during createUser – attempting recovery via listUsers lookup...');
        const existing = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);
        if (existing?.id) {
          authUserId = existing.id;
          treatAsExisting = true;
        }
      }

      if (!treatAsExisting && !authUserId) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user account',
            details: msg || 'Unexpected error during account creation'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // At this point, either a new user was created or we resolved an existing one
    const finalUserId = authUserId || newUserData!.user!.id;
    console.log('Using auth user ID:', finalUserId, 'existing:', treatAsExisting);

    // Update invitation status to accepted (idempotent)
    const { error: updateInvitationError } = await supabaseAdmin
      .from('user_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationData.id);

    if (updateInvitationError) {
      console.error('Failed to update invitation status:', updateInvitationError);
    }

    // Upsert user record in users table
    const { error: createUserRecordError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: finalUserId,
        email: normalizedEmail,
        role: invitationData.role,
        client_name: invitationData.client_name,
        display_name: invitationData.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'auth_user_id',
        ignoreDuplicates: false
      });

    if (createUserRecordError) {
      console.error('Failed to upsert user record:', createUserRecordError);
      // Continue; auth user exists
    }

    // Create or link company membership
    if (invitationData.company_id) {
      await upsertMembership(supabaseAdmin, invitationData.company_id, finalUserId);
    } else if (invitationData.client_name) {
      const companyId = await ensureCompanyFromName(supabaseAdmin, invitationData.client_name);
      if (companyId) {
        await upsertMembership(supabaseAdmin, companyId, finalUserId);
      }
    }

    // Log security event
    await supabaseAdmin.rpc('log_security_event', {
      event_type: 'invitation_account_created',
      event_details: { 
        user_id: finalUserId,
        email: normalizedEmail,
        role: invitationData.role,
        invitation_id: invitationData.id
      },
      user_id: finalUserId
    });

    console.log('Account creation flow completed successfully');

    // Consistent success payload; frontend can proceed to sign-in with email/password
    return new Response(
      JSON.stringify({ 
        success: true,
        should_login: true,
        user: {
          id: finalUserId,
          email: normalizedEmail,
          role: invitationData.role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in accept-invitation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message ?? String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
