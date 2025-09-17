import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  userEmail: string;
  options?: {
    deleteNewsletter?: boolean;
    deleteUserRecord?: boolean;
    deleteInvitations?: boolean;
    deleteAuth?: boolean;
    deleteAll?: boolean;
  };
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

    const { userEmail, options }: DeleteUserRequest = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const opts = {
      deleteNewsletter: options?.deleteNewsletter ?? true,
      deleteUserRecord: options?.deleteUserRecord ?? true,
      deleteInvitations: options?.deleteInvitations ?? true,
      deleteAuth: options?.deleteAuth ?? true,
      deleteAll: options?.deleteAll ?? (options ? false : true),
    };

    console.log(`Admin ${user.email} initiated deletion of user: ${userEmail}`, opts);

    let targetAuthUserId: string | null = null;
    let authDeleted = false;

    if (opts.deleteAll || opts.deleteAuth) {
      // Find target auth user
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Failed to list auth users:', listError);
      } else {
        const match = authUsers.users.find((u) => u.email === userEmail);
        targetAuthUserId = match?.id ?? null;
      }

      if (!targetAuthUserId) {
        console.warn(`User not found in auth.users: ${userEmail}${opts.deleteAuth ? ' — skipping auth deletion' : ''}`);
      } else if (opts.deleteAuth || opts.deleteAll) {
        console.log(`Deleting user from auth.users: ${userEmail}`);
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetAuthUserId);
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
        authDeleted = true;
        console.log('Successfully deleted user from auth.users');
      }
    }

    let databaseCleanup: any = null;

    if (opts.deleteAll) {
      console.log(`Cleaning up all related data for: ${userEmail}`);
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('delete_user_completely_enhanced', { user_email: userEmail });
      if (cleanupError) {
        console.error('Database cleanup failed:', cleanupError);
        return new Response(
          JSON.stringify({ 
            error: 'User deleted from auth but database cleanup failed',
            details: cleanupError.message,
            authDeleted: authDeleted
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      databaseCleanup = cleanupResult;
    } else {
      // Partial operations
      const partialSummary: Record<string, number | boolean | null> = {
        newsletter_deleted: 0,
        users_deleted: 0,
        memberships_deleted: 0,
        invitations_cancelled: 0,
      };

      if (opts.deleteUserRecord) {
        // Look up auth_user_id for membership cleanup (case-insensitive)
        const { data: userRows } = await supabase
          .from('users')
          .select('auth_user_id')
          .ilike('email', userEmail)
          .limit(1);

        const userRow = userRows?.[0];
        if (userRow?.auth_user_id) {
          const { error: delMemErr, count } = await supabase
            .from('company_memberships')
            .delete({ count: 'exact' })
            .eq('user_id', userRow.auth_user_id);
          if (delMemErr) console.warn('Membership deletion warning:', delMemErr.message);
          else partialSummary.memberships_deleted = (count ?? 0);
        }

        // Delete users table record (case-insensitive)
        const { error: delUserErr, count: usersCount } = await supabase
          .from('users')
          .delete({ count: 'exact' })
          .ilike('email', userEmail);
        if (delUserErr) console.warn('Users delete warning:', delUserErr.message);
        else partialSummary.users_deleted = (usersCount ?? 0);
      }

      if (opts.deleteInvitations) {
        // Cancel invitations (case-insensitive)
        const { error: cancelInvErr, count: cancelCount } = await supabase
          .from('user_invitations')
          .update({ status: 'cancelled' })
          .ilike('email', userEmail)
          .eq('status', 'pending');
        if (cancelInvErr) console.warn('Invitation cancel warning:', cancelInvErr.message);
        else partialSummary.invitations_cancelled = (cancelCount ?? 0);
      }

      if (opts.deleteNewsletter) {
        // Delete newsletter subscription (case-insensitive)
        const { error: delNewsErr, count: newsCount } = await supabase
          .from('newsletter_subscriptions')
          .delete({ count: 'exact' })
          .ilike('email', userEmail);
        if (delNewsErr) console.warn('Newsletter delete warning:', delNewsErr.message);
        else partialSummary.newsletter_deleted = (newsCount ?? 0);
      }

      databaseCleanup = { success: true, cleanup_summary: partialSummary };
    }

    const result = {
      success: true,
      message: opts.deleteAll ? `User ${userEmail} has been completely deleted` : `Delete operation completed for ${userEmail}`,
      userEmail,
      authUserId: targetAuthUserId,
      authDeleted,
      options: opts,
      databaseCleanup,
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