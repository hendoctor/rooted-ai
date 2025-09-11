import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const generateCorsHeaders = (origin?: string) => {
  const allowedOrigins = [
    'https://rootedai.tech',
    'https://rooted-ai.lovable.app',
    'https://lovable.dev',
    'https://app.lovable.dev'
  ];
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.lovable.dev') ||
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:5173'
  );
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://rootedai.tech',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

// Simple in-memory rate limit per IP: max 20 events per minute
const rateMap = new Map<string, { count: number; window: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 1000;

const getClientIP = (req: Request): string => {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

serve(async (req) => {
  const origin = req.headers.get('origin') || undefined;
  const corsHeaders = generateCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Require authenticated caller
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IP-based rate limit
    const ip = getClientIP(req);
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now - entry.window > WINDOW_MS) {
      rateMap.set(ip, { count: 1, window: now });
    } else {
      if (entry.count >= RATE_LIMIT) {
        return new Response(JSON.stringify({ error: 'Too many events' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      entry.count += 1;
      rateMap.set(ip, entry);
    }

    const { event_type, event_details } = await req.json();

    if (!event_type) {
      return new Response(
        JSON.stringify({ error: 'event_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize event details to prevent sensitive data leakage
    const sanitizedDetails = event_details ? {
      severity: event_details.severity || 'medium',
      timestamp: event_details.timestamp || new Date().toISOString(),
      url: (() => { try { return event_details.url ? new URL(event_details.url).pathname : undefined } catch { return undefined } })(),
      user_agent_family: event_details.user_agent ? String(event_details.user_agent).split(' ')[0] : undefined,
      endpoint: event_details.endpoint,
      result: event_details.result,
      error_type: event_details.error_type
    } : null;

    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        event_type,
        event_details: sanitizedDetails,
        ip_address: ip,
        user_agent: req.headers.get('user-agent')?.substring(0, 255) || null,
        user_id: userData.user.id,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log security event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Security event logging error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})