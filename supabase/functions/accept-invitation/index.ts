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

    console.log('Valid invitation found:', invitationData.email);


    // Create user with admin API (bypasses email confirmation)
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: invitationData.email,
      password: password,
      email_confirm: true, // Skip email confirmation for invited users
      user_metadata: {
        full_name: invitationData.full_name,
        role: invitationData.role,
        client_name: invitationData.client_name,
        invitation_id: invitationData.id
      }
    });

    if (createUserError || !newUserData?.user) {
      console.error('Failed to create user:', createUserError);
      const msg = (createUserError as any)?.message || '';
      const status = (createUserError as any)?.status;

      // If the user already exists, mark invitation as accepted and instruct client to log in
      if (status === 422 || /already exists|already registered|User already/i.test(msg)) {
        await supabaseAdmin
          .from('user_invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitationData.id);

        return new Response(
          JSON.stringify({ 
            success: true,
            should_login: true,
            message: 'Account already exists. Please log in.'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to create user account',
          details: msg 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created successfully:', newUserData.user.id);

    // Update invitation status to accepted
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

    // Create user record in users table
    const { error: createUserRecordError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: newUserData.user.id,
        email: invitationData.email,
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
      console.error('Failed to create user record:', createUserRecordError);
      // Don't fail the request since the auth user was created successfully
    }

    // Create company membership if invitation has company_id
    if (invitationData.company_id) {
      const { error: membershipError } = await supabaseAdmin
        .from('company_memberships')
        .insert({
          company_id: invitationData.company_id,
          user_id: newUserData.user.id,
          role: 'Member',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (membershipError) {
        console.error('Failed to create company membership:', membershipError);
      }
    }

    // Log security event
    await supabaseAdmin.rpc('log_security_event', {
      event_type: 'invitation_account_created',
      event_details: { 
        user_id: newUserData.user.id,
        email: invitationData.email,
        role: invitationData.role,
        invitation_id: invitationData.id
      },
      user_id: newUserData.user.id
    });

    console.log('Account creation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: newUserData.user.id,
          email: newUserData.user.email,
          role: invitationData.role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in accept-invitation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});