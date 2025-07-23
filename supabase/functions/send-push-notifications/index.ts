import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string
  p256dh_key: string
  auth_key: string
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

// Replace this with your generated public key
const VAPID_PUBLIC_KEY = "BJr_trKVn2aUm9tMQOuTrsn-ixaiu5bwS_lbcSlasXv8dL-abFhcmNKtvl42IXCs_jikCutIl3kj8X2UsvhkrYw"

async function sendWebPush(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
  try {
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPrivateKey) {
      console.error('VAPID_PRIVATE_KEY not configured');
      return false;
    }

    const jwt = await generateJWT();
    const vapidHeaders = {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
      'Content-Type': 'application/json'
    }

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: vapidHeaders,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      console.error('Push notification failed:', response.status, await response.text());
      return false;
    }
    
    return response.ok
  } catch (error) {
    console.error('Push notification failed:', error)
    return false
  }
}

async function generateJWT(): Promise<string> {
  try {
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPrivateKey) {
      throw new Error('VAPID_PRIVATE_KEY not configured');
    }

    // Import the private key for signing
    const privateKeyDER = Uint8Array.from(atob(vapidPrivateKey), c => c.charCodeAt(0));
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyDER,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );

    // Create JWT header and payload
    const header = {
      typ: 'JWT',
      alg: 'ES256'
    };

    const payload = {
      aud: 'https://fcm.googleapis.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: 'mailto:james@hennahane.com'
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      privateKey,
      data
    );

    // Encode signature
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  } catch (error) {
    console.error('JWT generation error:', error);
    throw error;
  }
}

async function generateJoke(): Promise<string> {
  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What do you call a fake noodle? An impasta!",
    "Why did the scarecrow win an award? He was outstanding in his field!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why don't oysters donate? Because they are shellfish!",
    "What did the ocean say to the beach? Nothing, it just waved!",
    "Why don't elephants use computers? They're afraid of the mouse!",
    "What do you call a sleeping bull? A bulldozer!"
  ]
  
  return jokes[Math.floor(Math.random() * jokes.length)]
}

function calculateNextNotification(frequency_type: string, frequency_value: number, frequency_days?: number[]): Date {
  const now = new Date()
  
  switch (frequency_type) {
    case 'minutes':
      return new Date(now.getTime() + frequency_value * 60 * 1000)
    case 'hours':
      return new Date(now.getTime() + frequency_value * 60 * 60 * 1000)
    case 'days':
      return new Date(now.getTime() + frequency_value * 24 * 60 * 60 * 1000)
    case 'specific_days':
      if (!frequency_days || frequency_days.length === 0) return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      
      const currentDay = now.getDay()
      const nextDay = frequency_days.find(day => day > currentDay) ?? frequency_days[0]
      const daysUntilNext = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay
      
      return new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 5 * 60 * 1000) // Default to 5 minutes
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users who should receive notifications
    const { data: schedulesData, error: schedulesError } = await supabaseClient
      .from('notification_schedules')
      .select(`
        user_id,
        next_notification_at,
        user_notification_settings!inner(enabled, frequency_type, frequency_value, frequency_days),
        push_subscriptions(endpoint, p256dh_key, auth_key)
      `)
      .lte('next_notification_at', new Date().toISOString())
      .eq('user_notification_settings.enabled', true)

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      return new Response(JSON.stringify({ error: schedulesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const schedule of schedulesData || []) {
      if (!schedule.push_subscriptions || schedule.push_subscriptions.length === 0) {
        continue
      }

      const joke = await generateJoke()
      const payload: NotificationPayload = {
        title: "🎭 Daily Dose of Humor",
        body: joke,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: {
          timestamp: Date.now(),
          type: 'joke'
        }
      }

      // Send to all user's devices
      for (const subscription of schedule.push_subscriptions) {
        const success = await sendWebPush(subscription, payload)
        results.push({
          user_id: schedule.user_id,
          success,
          endpoint: subscription.endpoint.substring(0, 50) + '...'
        })
      }

      // Update next notification time
      const settings = schedule.user_notification_settings
      const nextNotification = calculateNextNotification(
        settings.frequency_type,
        settings.frequency_value,
        settings.frequency_days
      )

      await supabaseClient
        .from('notification_schedules')
        .update({ next_notification_at: nextNotification.toISOString() })
        .eq('user_id', schedule.user_id)
    }

    return new Response(JSON.stringify({ 
      message: 'Push notifications sent',
      results,
      total_sent: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-push-notifications:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})