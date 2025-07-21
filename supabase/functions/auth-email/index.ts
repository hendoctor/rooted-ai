import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  type: 'signup' | 'recovery' | 'email_change' | 'magic_link';
  token?: string;
  redirect_url?: string;
  site_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, token, redirect_url, site_url }: AuthEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${email}`);

    let subject: string;
    let html: string;

    switch (type) {
      case 'signup':
        subject = "Welcome to RootedAI - Verify Your Email";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
            <div style="background: linear-gradient(135deg, #2d4a22 0%, #4a7c59 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to RootedAI!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Grow Smarter. Stay Rooted.</p>
            </div>
            
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #2d4a22; margin: 0 0 20px 0;">Verify Your Email Address</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Thanks for signing up! Please verify your email address to activate your RootedAI account and start accessing our AI-powered business solutions.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${redirect_url || site_url}" 
                   style="display: inline-block; background: #4a7c59; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${redirect_url || site_url}" style="color: #4a7c59; word-break: break-all;">${redirect_url || site_url}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; margin: 0;">
                If you didn't create an account with RootedAI, you can safely ignore this email.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
              © ${new Date().getFullYear()} RootedAI - Helping Kansas City businesses grow smarter with AI
            </div>
          </div>
        `;
        break;

      case 'recovery':
        subject = "Reset Your RootedAI Password";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
            <div style="background: linear-gradient(135deg, #2d4a22 0%, #4a7c59 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">RootedAI Account Recovery</p>
            </div>
            
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #2d4a22; margin: 0 0 20px 0;">Reset Your Password</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your password for your RootedAI account. Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${redirect_url || site_url}" 
                   style="display: inline-block; background: #4a7c59; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${redirect_url || site_url}" style="color: #4a7c59; word-break: break-all;">${redirect_url || site_url}</a>
              </p>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>Security Note:</strong> This link will expire in 24 hours for your security. If you didn't request this password reset, you can safely ignore this email.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; margin: 0;">
                If you didn't request a password reset, please contact our support team.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
              © ${new Date().getFullYear()} RootedAI - Helping Kansas City businesses grow smarter with AI
            </div>
          </div>
        `;
        break;

      case 'email_change':
        subject = "Confirm Your Email Change - RootedAI";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
            <div style="background: linear-gradient(135deg, #2d4a22 0%, #4a7c59 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Email Change Request</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">RootedAI Account Update</p>
            </div>
            
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #2d4a22; margin: 0 0 20px 0;">Confirm Your New Email</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Please confirm that you want to change your email address for your RootedAI account to: <strong>${email}</strong>
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${redirect_url || site_url}" 
                   style="display: inline-block; background: #4a7c59; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Confirm Email Change
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${redirect_url || site_url}" style="color: #4a7c59; word-break: break-all;">${redirect_url || site_url}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; margin: 0;">
                If you didn't request this email change, please contact our support team immediately.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
              © ${new Date().getFullYear()} RootedAI - Helping Kansas City businesses grow smarter with AI
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unsupported email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "RootedAI <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in auth-email function:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);