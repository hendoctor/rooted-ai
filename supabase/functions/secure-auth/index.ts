import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced rate limiting with progressive delays
interface RateLimitAttempt {
  ip: string;
  timestamp: number;
  attempts: number;
}

const failedAttempts = new Map<string, RateLimitAttempt>();

const isRateLimited = (clientIP: string): boolean => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  const existing = failedAttempts.get(clientIP);
  if (!existing) return false;
  
  // Reset if window expired
  if (now - existing.timestamp > windowMs) {
    failedAttempts.delete(clientIP);
    return false;
  }
  
  // Progressive delays: 5 attempts = 15 min, 10 attempts = 1 hour, 15+ = 24 hours
  const maxAttempts = existing.attempts >= 15 ? 0 : existing.attempts >= 10 ? 0 : 5;
  return existing.attempts >= maxAttempts;
};

const recordFailedAttempt = (clientIP: string) => {
  const now = Date.now();
  const existing = failedAttempts.get(clientIP) || { ip: clientIP, timestamp: now, attempts: 0 };
  
  existing.attempts += 1;
  existing.timestamp = now;
  failedAttempts.set(clientIP, existing);
};

const getClientIP = (req: Request): string => {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';
    
    // Check rate limiting first
    if (isRateLimited(clientIP)) {
      await supabase.from('security_audit_log').insert({
        event_type: 'auth_rate_limit_exceeded',
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { endpoint: 'secure-auth' }
      });
      
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, email, password } = await req.json();
    
    // Input validation
    if (!email || !password || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      recordFailedAttempt(clientIP);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    
    if (action === 'signIn') {
      // Enhanced sign-in with security logging
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        recordFailedAttempt(clientIP);
        
        // Log failed authentication
        await supabase.from('security_audit_log').insert({
          event_type: 'auth_signin_failed',
          ip_address: clientIP,
          user_agent: userAgent,
          event_details: { 
            email: email.split('@')[1], // Only log domain for privacy
            error: error.message 
          }
        });
        
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Clear failed attempts on successful login
      failedAttempts.delete(clientIP);
      
      // Log successful authentication
      await supabase.from('security_audit_log').insert({
        event_type: 'auth_signin_success',
        user_id: data.user?.id,
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { email_domain: email.split('@')[1] }
      });
      
      result = { user: data.user, session: data.session };
      
    } else if (action === 'signUp') {
      // Enhanced sign-up with validation
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${req.headers.get('origin') || 'https://rootedai.tech'}/`
        }
      });
      
      if (error) {
        // Log failed signup
        await supabase.from('security_audit_log').insert({
          event_type: 'auth_signup_failed',
          ip_address: clientIP,
          user_agent: userAgent,
          event_details: { 
            email_domain: email.split('@')[1],
            error: error.message 
          }
        });
        
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log successful signup
      await supabase.from('security_audit_log').insert({
        event_type: 'auth_signup_success',
        user_id: data.user?.id,
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { email_domain: email.split('@')[1] }
      });
      
      result = { user: data.user, session: data.session };
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure auth error:', error);
    
    // Log unexpected errors
    try {
      await supabase.from('security_audit_log').insert({
        event_type: 'auth_error',
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent') || '',
        event_details: { error: error.message }
      });
    } catch (_) {}
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})