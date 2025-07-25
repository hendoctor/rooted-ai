import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      }
    });
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
    
    // Server-side rate limiting check
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        identifier: clientIP,
        max_requests: 5,
        window_seconds: 300 // 5 minutes
      });

    if (rateLimitError || !rateLimitCheck) {
      console.log('Rate limit exceeded for IP:', clientIP);
      
      // Log security event
      await supabase.from('security_audit_log').insert({
        event_type: 'rate_limit_exceeded',
        ip_address: clientIP,
        user_agent: userAgent,
        event_details: { endpoint: 'contact-form' }
      });

      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, message, service_type } = await req.json();

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
        event_details: { error: error.message }
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