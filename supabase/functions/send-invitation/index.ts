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
  client_name?: string;
  company_id?: string;
  company_role?: string;
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

    // Get request body early to check company_id
    const requestBody: InvitationRequest = await req.json();
    const { email, full_name, role } = requestBody;

    const rawClientName = typeof requestBody.client_name === "string"
      ? requestBody.client_name.trim()
      : "";
    let requestedClientName =
      rawClientName && rawClientName.toLowerCase() !== "undefined"
        ? rawClientName
        : "";

    const rawCompanyId = typeof requestBody.company_id === "string"
      ? requestBody.company_id.trim()
      : "";
    const sanitizedCompanyId =
      rawCompanyId && rawCompanyId.toLowerCase() !== "undefined"
        ? rawCompanyId
        : "";

    let targetCompanyId: string | null = sanitizedCompanyId || null;

    // Attempt to resolve company details if only name is provided
    if (!targetCompanyId && requestedClientName) {
      const normalizedName = requestedClientName.replace(/\s+/g, " ").trim();
      const derivedSlug = normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      const nameFilterValue = `%${normalizedName}%`;
      const filterParts = [] as string[];
      if (derivedSlug) {
        filterParts.push(`slug.eq.${derivedSlug}`);
      }
      filterParts.push(`name.ilike.${nameFilterValue}`);

      const { data: companyMatch, error: companyLookupError } = await supabaseClient
        .from("companies")
        .select("id, name")
        .or(filterParts.join(','))
        .maybeSingle();

      if (companyLookupError) {
        console.error("Failed to look up company by name:", companyLookupError);
      }

      if (companyMatch) {
        targetCompanyId = companyMatch.id;
        requestedClientName = companyMatch.name;
      }
    }

    // Check if user has admin permissions (global or company-specific)
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("email", user.email)
      .single();

    if (userError) {
      throw new Error("Failed to verify user permissions");
    }

    // Check authorization: Global admin OR company admin
    let isAuthorized = false;
    let authorizationType = "";
    let adminMemberships: Array<{ company_id: string; company_name: string | null }> = [];

    if (userData?.role === "Admin") {
      // Global admin can invite to any company
      isAuthorized = true;
      authorizationType = "global_admin";
    } else {
      const { data: membershipData, error: membershipError } = await supabaseClient
        .from("company_memberships")
        .select("company_id, role, companies(name)")
        .eq("user_id", user.id)
        .eq("role", "Admin");

      if (membershipError) {
        console.error("Failed to verify company membership:", membershipError);
        throw new Error("Failed to verify user permissions");
      }

      const membershipRows = (membershipData ?? []) as Array<{
        company_id: string;
        companies?: { name?: string | null } | null;
      }>;

      adminMemberships = membershipRows.map((membership) => ({
        company_id: membership.company_id,
        company_name: membership.companies?.name ?? null,
      }));

      if (!targetCompanyId) {
        if (adminMemberships.length === 1) {
          targetCompanyId = adminMemberships[0].company_id;
          if (!requestedClientName && adminMemberships[0].company_name) {
            requestedClientName = adminMemberships[0].company_name ?? "";
          }
        } else if (adminMemberships.length > 1) {
          throw new Error("Please specify which company to invite the user to");
        }
      }

      if (targetCompanyId && adminMemberships.some((membership) => membership.company_id === targetCompanyId)) {
        isAuthorized = true;
        authorizationType = "company_admin";
      }
    }

    if (targetCompanyId && !requestedClientName) {
      const { data: companyRecord, error: companyRecordError } = await supabaseClient
        .from("companies")
        .select("name")
        .eq("id", targetCompanyId)
        .maybeSingle();

      if (companyRecordError) {
        console.error("Failed to fetch company details:", companyRecordError);
      }

      if (companyRecord?.name) {
        requestedClientName = companyRecord.name;
      }
    }

    if (!targetCompanyId && authorizationType !== "global_admin") {
      throw new Error("Company context is required to send this invitation");
    }

    if (!isAuthorized) {
      // Log unauthorized invitation attempt
      await supabaseClient.rpc('log_security_event', {
        event_type: 'unauthorized_invitation_attempt',
        event_details: {
          attempted_by: user.email,
          user_role: userData?.role,
          company_id: targetCompanyId,
          ip_address: req.headers.get('x-forwarded-for')
        }
      });

      const errorMessage = targetCompanyId
        ? "You don't have admin permissions for this company"
        : "Insufficient permissions - admin role required";
      throw new Error(errorMessage);
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

    console.log("Processing invitation for:", { email, full_name, role, company_id: targetCompanyId, authorization: authorizationType });

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
    const invitationData: {
      invited_by: string;
      email: string;
      full_name: string;
      role: string;
      client_name: string | null;
      company_id?: string;
    } = {
      invited_by: user.id,
      email,
      full_name,
      role,
      client_name: requestedClientName || null,
    };

    // Add company_id if provided (for company-specific invitations)
    if (targetCompanyId) {
      invitationData.company_id = targetCompanyId;
    }
    
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("user_invitations")
      .insert(invitationData)
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      const msg = inviteError.message || inviteError.details || inviteError.hint || "Failed to create invitation";
      throw new Error(msg);
    }

    console.log("Created invitation:", invitation);

    // Log successful invitation creation
    await supabaseClient.rpc('log_security_event', {
      event_type: 'invitation_sent',
      event_details: { 
        invited_email: email, 
        invited_role: role,
        invited_by: user.email,
        invitation_id: invitation.id,
        company_id: targetCompanyId,
        authorization_type: authorizationType
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
    
    // Use the exact token as generated (case-sensitive)
    const inviteUrl = `${baseUrl}/auth?invite=${invitation.invitation_token}`;
    
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
              <strong>Important:</strong> This invitation will expire in 24 hours.
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
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    const message = error instanceof Error ? error.message : "Failed to send invitation";
    return new Response(
      JSON.stringify({
        error: message,
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