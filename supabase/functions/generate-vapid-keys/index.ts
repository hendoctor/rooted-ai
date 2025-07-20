import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate VAPID key pair using Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );

    // Export public key
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyArray = new Uint8Array(publicKeyBuffer);
    
    // Convert to base64url format for VAPID
    const publicKey = btoa(String.fromCharCode.apply(null, Array.from(publicKeyArray)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Export private key 
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyArray = new Uint8Array(privateKeyBuffer);
    const privateKey = btoa(String.fromCharCode.apply(null, Array.from(privateKeyArray)));

    console.log('Generated VAPID keys successfully');

    return new Response(
      JSON.stringify({
        success: true,
        // The exported public key already includes the uncompressed prefix (0x04)
        // so we simply return the base64url string as-is. Adding extra characters
        // will produce an invalid key for the Push API.
        publicKey,
        privateKey,
        message: "VAPID keys generated successfully. Store these securely!"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Failed to generate VAPID keys"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});