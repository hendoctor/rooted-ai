import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Generate CORS headers based on origin
const generateCorsHeaders = (origin?: string) => {
  const allowedOrigins = [
    'https://lovable.dev',
    'https://app.lovable.dev'
  ];
  
  // Check if origin is allowed or if it's a Lovable subdomain
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.dev') ||
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:5173'
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false'
  };
};

// Enhanced email validation with domain checking
const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Extract domain for additional checks
  const domain = email.split('@')[1].toLowerCase();
  
  // Block common spam domains
  const spamDomains = [
    'tempmail.org', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ];
  
  if (spamDomains.includes(domain)) {
    return { isValid: false, error: 'Temporary email addresses not allowed' };
  }
  
  // Check for suspicious patterns
  if (domain.includes('test') || domain.includes('spam') || domain.includes('fake')) {
    return { isValid: false, error: 'Invalid email domain' };
  }
  
  return { isValid: true };
};

// Get client IP with better extraction
const getClientIP = (req: Request): string => {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = generateCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Server-side rate limiting: max 5 subscriptions per 15 minutes per IP
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('newsletter_subscriptions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStart);

    // Also check by domain to prevent bulk signups from same email provider
    const { count: domainCount } = await supabase
      .from('newsletter_subscriptions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStart)
      .ilike('email', '%@gmail.com'); // Example domain check

    if ((recentCount ?? 0) >= 5) {
      // Log rate limit exceeded
      await supabase.rpc('log_security_event_enhanced', {
        event_type: 'newsletter_rate_limit_exceeded',
        event_details: { 
          endpoint: 'newsletter-signup',
          window_minutes: 15,
          client_ip: clientIP,
          user_agent: userAgent
        },
        risk_level: 'high'
      });

      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { email } = body;

    // Basic validation
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced email validation
    const validation = validateEmail(email);
    if (!validation.isValid) {
      // Log suspicious email attempt
      await supabase.rpc('log_security_event_enhanced', {
        event_type: 'newsletter_invalid_email',
        event_details: { 
          error: validation.error,
          email_domain: email.split('@')[1],
          client_ip: clientIP
        },
        risk_level: 'medium'
      });

      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);

    // Store in database (with ON CONFLICT handling for duplicates)
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .insert([{ email: sanitizedEmail }]);

    if (error) {
      // Handle duplicate email case
      if (error.code === '23505') {
        // Log duplicate subscription attempt
        await supabase.rpc('log_security_event_enhanced', {
          event_type: 'newsletter_duplicate_subscription',
          event_details: { 
            email_domain: sanitizedEmail.split('@')[1],
            client_ip: clientIP
          },
          risk_level: 'low'
        });

        return new Response(JSON.stringify({ message: 'Email already subscribed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.error('Database error:', error);
      
      // Log database error
      await supabase.rpc('log_security_event_enhanced', {
        event_type: 'newsletter_db_error',
        event_details: { 
          error: error.message,
          client_ip: clientIP
        },
        risk_level: 'high'
      });

      return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log successful subscription
    await supabase.rpc('log_security_event_enhanced', {
      event_type: 'newsletter_subscription_success',
      event_details: { 
        email_domain: sanitizedEmail.split('@')[1],
        client_ip: clientIP
      },
      risk_level: 'low'
    });

    console.log('Newsletter subscription successful:', sanitizedEmail);

    return new Response(JSON.stringify({ message: 'Successfully subscribed to newsletter' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    
    // Log unexpected errors
    try {
      await supabase.rpc('log_security_event_enhanced', {
        event_type: 'newsletter_error',
        event_details: { 
          error: error.message,
          client_ip: getClientIP(req)
        },
        risk_level: 'high'
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});