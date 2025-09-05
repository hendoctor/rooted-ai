import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Generate CORS headers based on origin - HARDENED
const generateCorsHeaders = (origin?: string) => {
  const allowedOrigins = [
    'https://rootedai.tech',
    'https://rooted-ai.lovable.app',
    'https://lovable.dev',
    'https://app.lovable.dev'
  ];
  
  // Check if origin is allowed (stricter validation)
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.dev') ||
    (origin.startsWith('http://localhost:') && (origin.includes(':3000') || origin.includes(':5173')))
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://rootedai.tech',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false'
  };
};

// Enhanced input sanitization
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate email format server-side
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validate name format server-side  
const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
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
  const corsHeaders = generateCorsHeaders(origin || undefined);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Parse body first to validate CSRF token
    const body = await req.json();
    const headerCsrf = req.headers.get('x-csrf-token') || '';
    const bodyCsrf = (body?.csrf_token as string) || '';
    const csrfRegex = /^[a-f0-9]{64}$/i;

    if (!headerCsrf || !bodyCsrf || headerCsrf !== bodyCsrf || !csrfRegex.test(headerCsrf)) {
      // Log CSRF validation failure
      try {
        const supabaseLog = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseLog.from('security_audit_log').insert({
          event_type: 'csrf_validation_failed',
          ip_address: clientIP,
          user_agent: userAgent,
          event_details: { endpoint: 'contact-form' }
        });
      } catch (_) {}

      return new Response(JSON.stringify({ error: 'Invalid security token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side rate limiting (coarse pre-check) remains but DB will ultimately decide
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .gte('created_at', windowStart);

    if ((recentCount ?? 0) >= 3) {
      await supabase.from('security_audit_log').insert({
        event_type: 'rate_limit_exceeded',
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { endpoint: 'contact-form', window_minutes: 10 }
      });

      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract payload after CSRF validation
    const { name, email, message, service_type } = body as { name: string; email: string; message: string; service_type?: string };

    // Server-side input validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateName(name)) {
      return new Response(JSON.stringify({ error: 'Invalid name format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length < 10 || message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Message length invalid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced server-side validation via DB function (origin + honeypot + fingerprint + rate limits)
    const honeypot: string = (body?.website || body?.honeypot || '').toString();
    const fingerprint = body?.fingerprint && typeof body.fingerprint === 'object'
      ? {
          screen: String(body.fingerprint.screen ?? ''),
          timezone: String(body.fingerprint.timezone ?? ''),
          language: String(body.fingerprint.language ?? '')
        }
      : null;

    const { data: validationResult, error: validationError } = await supabase.rpc('validate_contact_submission_enhanced', {
      p_ip_address: clientIP,
      p_user_agent: userAgent,
      p_origin: origin,
      p_honeypot_field: honeypot || null,
      p_fingerprint_data: fingerprint
    });

    if (validationError) {
      console.error('validate_contact_submission error:', validationError);
      return new Response(JSON.stringify({ error: 'Submission validation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (validationResult && (validationResult as any).allowed === false) {
      const status = (validationResult as any).honeypot_violation ? 400 : 429;
      return new Response(
        JSON.stringify({ error: (validationResult as any).reason || 'Request blocked' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize all inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      message: sanitizeInput(message),
      service_type: service_type ? sanitizeInput(service_type) : null,
      ip_address: clientIP,
      user_agent: userAgent,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert(sanitizedData)
      .select();

    if (error) {
      console.error('Database error:', error);
      
      // Log security event for database errors
      await supabase.from('security_audit_log').insert({
        event_type: 'contact_form_db_error',
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { error: error.message }
      });

      return new Response(JSON.stringify({ error: 'Submission failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log successful submission
    await supabase.from('security_audit_log').insert({
      event_type: 'contact_form_submitted',
      ip_address: clientIP,
      user_agent: userAgent,
      event_details: { 
        submission_id: data[0]?.id,
        service_type: sanitizedData.service_type 
      }
    });

    return new Response(JSON.stringify({ 
      message: 'Form submitted successfully',
      id: data[0]?.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    
    // Log unexpected errors
    try {
      await supabase.from('security_audit_log').insert({
        event_type: 'contact_form_error',
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent') || '',
        event_details: { error: (error as Error).message }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});