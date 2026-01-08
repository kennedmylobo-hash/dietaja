import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== NOTIFICAME WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  try {
    const body = await req.text();
    console.log('Raw Body:', body);

    let parsedBody = null;
    if (body) {
      try {
        parsedBody = JSON.parse(body);
        console.log('Parsed Body:', JSON.stringify(parsedBody, null, 2));
      } catch {
        console.log('Body is not JSON, raw text:', body);
      }
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log specific fields if they exist
    if (parsedBody) {
      if (parsedBody.status) console.log('Status:', parsedBody.status);
      if (parsedBody.messageId) console.log('Message ID:', parsedBody.messageId);
      if (parsedBody.id) console.log('ID:', parsedBody.id);
      if (parsedBody.to) console.log('To:', parsedBody.to);
      if (parsedBody.error) console.log('Error:', parsedBody.error);

      // Map NotificaMe status to our event types
      // NotificaMe statuses: sent, delivered, read, failed
      const statusMap: Record<string, string> = {
        'sent': 'sent',
        'delivered': 'delivered',
        'read': 'read',
        'failed': 'failed',
        'error': 'failed',
      };

      const messageId = parsedBody.messageId || parsedBody.id;
      const status = parsedBody.status?.toLowerCase();
      const eventType = statusMap[status];

      if (messageId && eventType) {
        console.log('Processing status update:', { messageId, eventType });

        // Try to find the original sent event to get order info
        let orderNumber = null;
        let orderId = null;
        let recipientPhone = parsedBody.to;

        const { data: existingEvent } = await supabase
          .from('notification_events')
          .select('order_id, order_number, recipient_phone')
          .eq('message_id', messageId)
          .eq('channel', 'whatsapp')
          .limit(1)
          .single();

        if (existingEvent) {
          orderId = existingEvent.order_id;
          orderNumber = existingEvent.order_number;
          recipientPhone = existingEvent.recipient_phone || recipientPhone;
          console.log('Found existing event, order:', orderNumber);
        }

        // Insert notification event
        const { error: insertError } = await supabase
          .from('notification_events')
          .insert({
            channel: 'whatsapp',
            event_type: eventType,
            order_id: orderId,
            order_number: orderNumber,
            recipient_phone: recipientPhone,
            message_id: messageId,
            metadata: parsedBody,
          });

        if (insertError) {
          console.error('Error inserting notification event:', insertError);
        } else {
          console.log('Successfully inserted notification event');
        }
      }
    }

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
