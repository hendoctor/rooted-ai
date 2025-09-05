import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Require authenticated ADMIN to run this function
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', userData.user.id)
      .single();

    if (roleErr || roleRow?.role !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('🧹 Starting user cleanup and reset process...');

    // Step 1: Get all existing users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to list users', details: listError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${existingUsers.users.length} existing users to delete`);

    // Step 2: Delete all existing users
    for (const user of existingUsers.users) {
      console.log(`🗑️ Deleting user: ${user.email}`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`❌ Failed to delete user ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Successfully deleted user: ${user.email}`);
      }
    }

    // Step 3: Create the new admin user with secure random password
    console.log('👑 Creating new admin user: james@hennahane.com');
    
    // Generate cryptographically secure random password
    const generateSecurePassword = () => {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => charset[byte % charset.length]).join('');
    };
    
    const securePassword = generateSecurePassword();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'james@hennahane.com',
      password: securePassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: 'James Hennahane',
        display_name: 'James Hennahane'
      }
    });

    if (createError) {
      console.error('❌ Error creating admin user:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user', details: createError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully created admin user:', newUser.user.email);

    // Step 4: Ensure the user record in our custom users table has Admin role
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: newUser.user.id,
        email: 'james@hennahane.com',
        role: 'Admin',
        client_name: null // Admin doesn't need a client name
      }, {
        onConflict: 'auth_user_id'
      });

    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to set admin role', details: updateError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully set Admin role for james@hennahane.com');

    // Step 5: Update the profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        email: 'james@hennahane.com',
        full_name: 'James Hennahane'
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: profileError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully updated profile for James Hennahane');

    // SECURITY: Never return passwords in API responses
    // Log password separately for admin access only
    console.log(`🔐 ADMIN PASSWORD: ${securePassword}`);
    console.log('⚠️  SECURITY: Password logged to function logs only - check Supabase Functions logs');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully reset users and created Admin account',
        admin_email: 'james@hennahane.com',
        note: 'Password has been logged to function logs for security. Check Supabase Functions logs to retrieve it.'
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})