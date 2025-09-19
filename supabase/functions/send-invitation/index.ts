import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ROOTED_AI_LOGO_DATA_URI =
  "data:image/png;base64,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" +
  "P5oq6KWpT/H7vsYejOK972AAAAAElFTkSuQmCC";


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
      .select("role, auth_user_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError) {
      throw new Error("Failed to verify user permissions");
    }

    // Check authorization: Global admin OR company admin
    let isAuthorized = false;
    let authorizationType = "";
    let adminMemberships: Array<{ company_id: string; company_name: string | null }> = [];

    console.log("Authorization check - User:", { id: user.id, email: user.email, role: userData?.role });

    if (userData?.role === "Admin") {
      // Global admin can invite to any company
      isAuthorized = true;
      authorizationType = "global_admin";
      console.log("Authorization: Global admin access granted");
    } else {
      // Check company admin permissions using service role to bypass RLS
      // Use the auth_user_id from the user record if available, otherwise use the JWT user ID
      const membershipUserId = userData?.auth_user_id || user.id;
      console.log("Checking company admin permissions for user:", { membershipUserId, jwtUserId: user.id });
      
      const { data: membershipData, error: membershipError } = await supabaseClient
        .from("company_memberships")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("role", "Admin");

      console.log("Company membership query result:", { membershipData, membershipError });

      if (membershipError) {
        console.error("Failed to verify company membership:", membershipError);
        // Log more details about the error
        console.error("Membership error details:", {
          code: membershipError.code,
          message: membershipError.message,
          details: membershipError.details,
          hint: membershipError.hint
        });
        throw new Error("Failed to verify user permissions");
      }

      if (membershipData && membershipData.length > 0) {
        // Get company names separately to avoid join issues
        for (const membership of membershipData) {
          const { data: companyData } = await supabaseClient
            .from("companies")
            .select("name")
            .eq("id", membership.company_id)
            .single();
          
          adminMemberships.push({
            company_id: membership.company_id,
            company_name: companyData?.name ?? null,
          });
        }
      }

      console.log("Admin memberships found:", adminMemberships);

      if (!targetCompanyId) {
        if (adminMemberships.length === 1) {
          targetCompanyId = adminMemberships[0].company_id;
          if (!requestedClientName && adminMemberships[0].company_name) {
            requestedClientName = adminMemberships[0].company_name ?? "";
          }
          console.log("Auto-selected company for invitation:", { targetCompanyId, requestedClientName });
        } else if (adminMemberships.length > 1) {
          console.log("Multiple admin memberships found, company must be specified");
          throw new Error("Please specify which company to invite the user to");
        }
      }

      if (targetCompanyId && adminMemberships.some((membership) => membership.company_id === targetCompanyId)) {
        isAuthorized = true;
        authorizationType = "company_admin";
        console.log("Authorization: Company admin access granted for company:", targetCompanyId);
      } else if (targetCompanyId) {
        console.log("User is not admin of target company:", { targetCompanyId, adminMemberships });
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

    // Prepare invitation payload - always Client for global role, company_role for membership
    const invitationRole = "Client"; // Always Client for global role when inviting to company
    
    // Normalize company_role: ensure it's only Admin or Member, default to Member
    let companyRole: string | null = null;
    if (targetCompanyId) {
      const rawCompanyRole = requestBody.company_role || requestBody.role || "Member";
      // Normalize: if it's "Client" or anything else invalid, default to "Member"
      if (rawCompanyRole === "Admin") {
        companyRole = "Admin";
      } else {
        companyRole = "Member"; // Default for anything else including "Client"
      }
    }

    // Create invitation record
    const invitationData: {
      invited_by: string;
      email: string;
      full_name: string;
      role: string;
      client_name: string | null;
      company_id?: string;
      company_role?: string | null;
    } = {
      invited_by: user.id,
      email,
      full_name,
      role: invitationRole,
      client_name: requestedClientName || null,
    };

    // Add company_id and company_role if provided (for company-specific invitations)
    if (targetCompanyId) {
      invitationData.company_id = targetCompanyId;
      invitationData.company_role = companyRole;
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
      from: "RootedAI Team <hi@rootedai.tech>",
      to: [email],
      subject: "RootedAI - Join our Partner Portal!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RootedAI - Join our Partner Portal!</title>
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
              padding-bottom: 24px;
              border-bottom: 2px solid #2d5016;
            }
            .logo {
              width: 140px;
              max-width: 65%;
              height: auto;
              margin: 0 auto 16px;
              display: block;
            }
            h1 {
              color: #2d5016;
              margin: 0;
              font-size: 30px;
            }
            .tagline {
              color: #4a7c59;
              margin: 12px 0 0;
              font-size: 16px;
              font-weight: 600;
              letter-spacing: 0.04em;
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
            @media (max-width: 600px) {
              body {
                padding: 16px;
              }
              .container {
                padding: 28px 20px;
              }
              h1 {
                font-size: 26px;
              }
              .welcome-text {
                font-size: 16px;
              }
              .cta-button {
                width: 100%;
                box-sizing: border-box;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${ROOTED_AI_LOGO_DATA_URI}" alt="RootedAI logo" class="logo" />
              <h1>Welcome to RootedAI</h1>
              <p class="tagline">Grow Smarter. Stay Rooted.</p>
            </div>

            <p class="welcome-text">
              Hello <strong>${full_name}</strong>,
            </p>

            <p>
              You've been invited to join the RootedAI Partner Portal with <span class="role-badge">${role}</span> access.
              We're excited to grow alongside you!
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