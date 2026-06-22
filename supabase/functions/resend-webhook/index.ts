import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildWebhookCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== RESEND WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  try {
    const body = await req.text();
    console.log('Raw Body:', body);

    let event = null;
    if (body) {
      try {
        event = JSON.parse(body);
        console.log('Parsed Event:', JSON.stringify(event, null, 2));
      } catch {
        console.log('Body is not JSON, raw text:', body);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid JSON' }),
          { status: 400, headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!event || !event.type) {
      console.log('No event type found');
      return new Response(
        JSON.stringify({ success: true, message: 'No event to process' }),
        { status: 200, headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map Resend event types to our event types
    // Resend events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
    const eventTypeMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'delayed',
    };

    const eventType = eventTypeMap[event.type];
    
    if (!eventType) {
      console.log('Unknown event type:', event.type);
      return new Response(
        JSON.stringify({ success: true, message: `Unknown event type: ${event.type}` }),
        { status: 200, headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from Resend event
    const data = event.data || {};
    const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;
    const emailId = data.email_id || data.id;

    console.log('Processing event:', {
      type: eventType,
      email_id: emailId,
      recipient: recipientEmail,
    });

    // Try to find the original sent event to get order info
    let orderNumber = null;
    let orderId = null;
    
    if (emailId) {
      const { data: existingEvent } = await supabase
        .from('notification_events')
        .select('order_id, order_number')
        .eq('message_id', emailId)
        .eq('channel', 'email')
        .limit(1)
        .single();
      
      if (existingEvent) {
        orderId = existingEvent.order_id;
        orderNumber = existingEvent.order_number;
        console.log('Found existing event, order:', orderNumber);
      }
    }

    // Insert notification event
    const { error: insertError } = await supabase
      .from('notification_events')
      .insert({
        channel: 'email',
        event_type: eventType,
        order_id: orderId,
        order_number: orderNumber,
        recipient_email: recipientEmail,
        message_id: emailId,
        metadata: data,
      });

    if (insertError) {
      console.error('Error inserting notification event:', insertError);
    } else {
      console.log('Successfully inserted notification event');
    }

    console.log('=== RESEND WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        event_type: eventType,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' }
      }
    );
  }
});
