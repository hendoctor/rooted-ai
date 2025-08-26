import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
}

interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  client_name?: string | null;
  full_name?: string | null;
  company_id?: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { token, password } = (await req.json()) as AcceptInvitationRequest;

    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Missing token or password" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Validate invitation token securely in DB
    let invitation: InvitationRecord | null = null;
    try {
      const { data: validationData, error: validationError } = await supabase.rpc(
        "validate_invitation_secure",
        { token_input: token }
      );

      if (validationError) {
        console.error("Invitation validation error:", validationError);
      } else {
        const validation = validationData as { valid: boolean; invitation?: InvitationRecord; error?: string };
        if (validation?.valid && validation.invitation) {
          invitation = validation.invitation;
        }
      }
    } catch (e) {
      console.error("validate_invitation_secure threw error:", e);
    }

    // Fallback validation if secure RPC fails
    if (!invitation) {
      const { data: inviteData, error: inviteError } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("invitation_token", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !inviteData) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invitation token" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      invitation = inviteData as InvitationRecord;
    }

    const email: string = invitation.email;
    const role: string = invitation.role || "Client";
    const client_name: string | null = invitation.client_name ?? null;
    const full_name: string | null = invitation.full_name ?? null;
    const company_id: string | null = invitation.company_id ?? null;

    // 2) Create auth user using Admin API and confirm email immediately
    const { data: createUserData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name, client_name, invitation_id: invitation.id },
    });

    if (createUserError) {
      console.error("Create user error:", createUserError);
      return new Response(
        JSON.stringify({ error: createUserError.message || "Unable to create user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const createdUser = createUserData.user;
    if (!createdUser) {
      return new Response(
        JSON.stringify({ error: "User creation failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3) Update DB: mark invitation accepted, create users row, add company membership
    const nowIso = new Date().toISOString();

    const updates: Promise<unknown>[] = [];

    updates.push(
      supabase
        .from("user_invitations")
        .update({ status: "accepted", accepted_at: nowIso })
        .eq("id", invitation.id)
    );

    updates.push(
      supabase.from("users").upsert(
        {
          auth_user_id: createdUser.id,
          email,
          role,
          client_name,
          display_name: full_name,
          updated_at: nowIso,
        },
        { onConflict: "auth_user_id" }
      )
    );

    if (company_id) {
      updates.push(
        supabase
          .from("company_memberships")
          .insert({ company_id, user_id: createdUser.id, role: "Member" })
          .select()
      );
    }

    const results = await Promise.all(updates);
    for (const r of results as Array<{ error?: unknown }>) {
      if (r.error) {
        console.error("Database update error:", r.error);
        // continue; don't fail signup if aux updates fail
      }
    }

    // Optional: log security event
    await supabase.rpc("log_security_event", {
      event_type: "invitation_account_created",
      event_details: {
        invitation_id: invitation.id,
        invited_email: email,
        invited_role: role,
      },
      user_id: createdUser.id,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, user_id: createdUser.id, email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: unknown) {
    console.error("accept-invitation unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
