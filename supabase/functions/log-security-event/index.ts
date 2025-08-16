import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

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
    const { event_type, event_details } = await req.json();
    
    // Validate required fields
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
      url: event_details.url ? new URL(event_details.url).pathname : undefined, // Only path, not full URL
      user_agent_family: event_details.user_agent ? 
        event_details.user_agent.split(' ')[0] : undefined, // Only browser family
      // Remove other potentially sensitive data
      endpoint: event_details.endpoint,
      result: event_details.result,
      error_type: event_details.error_type
    } : null;
    
    // Insert security event with client IP
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        event_type,
        event_details: sanitizedDetails,
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent')?.substring(0, 255) || null,
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