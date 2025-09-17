import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  userEmail: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow authenticated requests
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the request is from an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || userData?.role !== 'Admin') {
      console.error('Admin verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userEmail }: DeleteUserRequest = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.email} initiated deletion of user: ${userEmail}`);

    // Step 1: Get the target user from auth.users to get their ID
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list auth users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to access user data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetAuthUser = authUsers.users.find(u => u.email === userEmail);
    
    if (!targetAuthUser) {
      console.warn(`User not found in auth.users: ${userEmail} — continuing with database cleanup only`);
    } else {
      console.log(`Found target user: ${targetAuthUser.id}`);
    }


      // Step 3: Delete user from auth.users using Admin API
      console.log(`Deleting user from auth.users: ${userEmail}`);
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetAuthUser.id);
      
      if (deleteAuthError) {
        console.error('Failed to delete from auth.users:', deleteAuthError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete user from authentication system',
            details: deleteAuthError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully deleted user from auth.users');
    } else {
      console.log('Skipping auth session revocation and deletion as user does not exist in auth.users');
    }

    // Step 4: Clean up all related data using our enhanced database function
    console.log(`Cleaning up related data for: ${userEmail}`);
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('delete_user_completely_enhanced', { user_email: userEmail });

    if (cleanupError) {
      console.error('Database cleanup failed:', cleanupError);
      return new Response(
        JSON.stringify({ 
          error: 'User deleted from auth but database cleanup failed',
          details: cleanupError.message,
          authDeleted: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Database cleanup completed:', cleanupResult);

    // Step 5: Final verification and response
    const result = {
      success: true,
      message: `User ${userEmail} has been completely deleted`,
      userEmail,
      authUserId: targetAuthUser ? targetAuthUser.id : null,
      sessionsRevoked: !!targetAuthUser,
      authDeleted: !!targetAuthUser,
      databaseCleanup: cleanupResult
    };

    console.log('User deletion completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in admin-delete-user:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during user deletion',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});