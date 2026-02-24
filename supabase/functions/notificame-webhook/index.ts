import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== EVOLUTION WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (parsedBody) {
      // Evolution API webhook events
      const event = parsedBody.event;
      const data = parsedBody.data;

      if (event && data) {
        console.log('Event:', event);

        // Map Evolution API events to our event types
        const eventMap: Record<string, string> = {
          'messages.update': 'delivered',
          'messages.read': 'read',
          'send.message': 'sent',
          'messages.upsert': 'received',
        };

        const eventType = eventMap[event];
        const messageId = data?.key?.id || data?.messageId || data?.id;
        const remoteJid = data?.key?.remoteJid || data?.remoteJid;

        // Extract phone from remoteJid (format: 5577XXXXXXXX@s.whatsapp.net)
        const recipientPhone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || null;

        if (messageId && eventType && eventType !== 'received') {
          console.log('Processing status update:', { messageId, eventType, recipientPhone });

          // Try to find existing event to get order info
          let orderId = null;
          let orderNumber = null;

          const { data: existingEvent } = await supabase
            .from('notification_events')
            .select('order_id, order_number')
            .eq('message_id', messageId)
            .eq('channel', 'whatsapp')
            .limit(1)
            .single();

          if (existingEvent) {
            orderId = existingEvent.order_id;
            orderNumber = existingEvent.order_number;
            console.log('Found existing event, order:', orderNumber);
          }

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
    }

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received', timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
