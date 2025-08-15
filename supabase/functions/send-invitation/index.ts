import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  full_name: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Set the auth for the request
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("email", user.email)
      .single();

    if (userError || userData?.role !== "Admin") {
      // Log unauthorized invitation attempt
      await supabaseClient.rpc('log_security_event', {
        event_type: 'unauthorized_invitation_attempt',
        event_details: { attempted_by: user.email, ip_address: req.headers.get('x-forwarded-for') }
      });
      throw new Error("Insufficient permissions");
    }

    // Check invitation rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc('check_invitation_rate_limit', {
      admin_id: user.id
    });

    if (rateLimitError || !rateLimitCheck) {
      // Log rate limit violation
      await supabaseClient.rpc('log_security_event', {
        event_type: 'invitation_rate_limit_exceeded',
        event_details: { admin_id: user.id, admin_email: user.email }
      });
      throw new Error("Rate limit exceeded. Please wait before sending more invitations.");
    }

    const { email, full_name, role }: InvitationRequest = await req.json();

    console.log("Processing invitation for:", { email, full_name, role });

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Check if there's already a pending invitation that hasn't expired (using UTC)
    const currentUTC = new Date().toISOString();
    const { data: existingInvitation } = await supabaseClient
      .from("user_invitations")
      .select("id, expires_at, status")
      .eq("email", email)
      .eq("status", "pending")
      .gt('expires_at', currentUTC)
      .maybeSingle();

    if (existingInvitation) {
      throw new Error("Active invitation already exists for this email");
    }

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("user_invitations")
      .insert({
        invited_by: user.id,
        email,
        full_name,
        role,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    console.log("Created invitation:", invitation);

    // Log successful invitation creation
    await supabaseClient.rpc('log_security_event', {
      event_type: 'invitation_sent',
      event_details: { 
        invited_email: email, 
        invited_role: role, 
        invited_by: user.email,
        invitation_id: invitation.id 
      }
    });

    // Create invitation URL with consistent domain and proper token handling
    const refererUrl = req.headers.get("referer");
    const originUrl = req.headers.get("origin");
    
    // Extract base URL more reliably
    let baseUrl = "https://rootedai.tech"; // Fallback
    
    if (originUrl) {
      baseUrl = originUrl;
    } else if (refererUrl) {
      try {
        const refererObj = new URL(refererUrl);
        baseUrl = `${refererObj.protocol}//${refererObj.host}`;
      } catch (e) {
        console.warn("Could not parse referer URL:", refererUrl);
      }
    }
    
    // Ensure token is properly formatted (lowercase for consistency)
    const inviteUrl = `${baseUrl}/auth?invite=${invitation.invitation_token.toLowerCase()}`;
    
    console.log("Generated invitation URL:", inviteUrl);
    console.log("Base URL:", baseUrl);
    console.log("Token:", invitation.invitation_token);

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Team <hi@rootedai.tech>",
      to: [email],
      subject: "You've been invited to join our platform!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Our Platform</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #2c3e50;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f6f1;
            }
            .container {
              background-color: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #2d5016;
            }
            .logo {
              width: 60px;
              height: 60px;
              background-color: #2d5016;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
              font-weight: bold;
            }
            h1 {
              color: #2d5016;
              margin: 0;
              font-size: 28px;
            }
            .welcome-text {
              font-size: 18px;
              margin-bottom: 30px;
              color: #5a6c7d;
            }
            .role-badge {
              display: inline-block;
              background-color: #9caf88;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin: 10px 0;
            }
            .cta-button {
              display: inline-block;
              background-color: #2d5016;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: background-color 0.3s;
            }
            .cta-button:hover {
              background-color: #1f3610;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e5;
              text-align: center;
              color: #7f8c8d;
              font-size: 14px;
            }
            .expires {
              color: #e74c3c;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">P</div>
              <h1>Welcome to Our Platform!</h1>
            </div>
            
            <p class="welcome-text">
              Hello <strong>${full_name}</strong>,
            </p>
            
            <p>
              You've been invited to join our platform with <span class="role-badge">${role}</span> access.
              We're excited to have you on board!
            </p>
            
            <p>
              Click the button below to accept your invitation and create your account:
            </p>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" class="cta-button">Accept Invitation & Sign Up</a>
            </div>
            
            <p class="expires">
              <strong>Important:</strong> This invitation will expire in 7 days.
            </p>
            
            <p>
              If you have any questions, please don't hesitate to reach out to our team.
            </p>
            
            <div class="footer">
              <p>
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p>
                This invitation was sent from our secure platform.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        invitation_id: invitation.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send invitation",
        success: false 
      }),
      {
        status: 400,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);