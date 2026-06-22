import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildWebhookCorsHeaders } from "../_shared/cors.ts";
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
      const event = parsedBody.event;
      const data = parsedBody.data;

      if (event && data) {
        console.log('Event:', event);

        const eventMap: Record<string, string> = {
          'messages.update': 'delivered',
          'messages.read': 'read',
          'send.message': 'sent',
          'messages.upsert': 'received',
        };

        const eventType = eventMap[event];
        const messageId = data?.key?.id || data?.messageId || data?.id;
        const remoteJid = data?.key?.remoteJid || data?.remoteJid;
        const recipientPhone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || null;
        const messageText = data?.message?.conversation || data?.message?.extendedTextMessage?.text || '';

        // Log notification event for status updates and received messages
        if (messageId && eventType) {
          let orderId = null;
          let orderNumber = null;

          const { data: existingEvent } = await supabase
            .from('notification_events')
            .select('order_id, order_number')
            .eq('message_id', messageId)
            .eq('channel', 'whatsapp')
            .limit(1)
            .maybeSingle();

          if (existingEvent) {
            orderId = existingEvent.order_id;
            orderNumber = existingEvent.order_number;
          }

          await supabase.from('notification_events').insert({
            channel: 'whatsapp',
            event_type: eventType,
            order_id: orderId,
            order_number: orderNumber,
            recipient_phone: recipientPhone,
            message_id: messageId,
            metadata: parsedBody,
          }).catch(e => console.error('Error inserting notification event:', e));
        }

        // === CHATBOT: auto-responder para mensagens de clientes ===
        // CRITICAL: Só responda mensagens DE clientes, NÃO mensagens enviadas pelo próprio sistema
        const fromMe = data?.key?.fromMe === true || data?.key?.participant === data?.key?.remoteJid;
        if (event === 'messages.upsert' && messageText && recipientPhone && !fromMe) {
          const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

          if (instanceName) {
            // Rate limit: no máximo 1 resposta a cada 10 segundos por telefone
            const rateKey = `chatbot_${recipientPhone}`;
            const { data: recentMsg } = await supabase
              .from('chat_messages')
              .select('created_at')
              .eq('customer_phone', recipientPhone)
              .eq('role', 'assistant')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const lastReply = recentMsg?.created_at ? new Date(recentMsg.created_at).getTime() : 0;
            const cooldown = 10000; // 10 segundos

            if (Date.now() - lastReply < cooldown) {
              console.log(`[CHATBOT] Rate limited for ${recipientPhone} — ${((Date.now() - lastReply) / 1000).toFixed(1)}s since last reply`);
            } else {
              console.log(`[CHATBOT] Incoming message from ${recipientPhone}: "${messageText.substring(0, 50)}..."`);

              try {
                await fetch(`${supabaseUrl}/functions/v1/whatsapp-chatbot`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                  body: JSON.stringify({
                    customerPhone: recipientPhone,
                    customerMessage: messageText,
                    instanceName,
                  }),
                });
                console.log(`[CHATBOT] AI response triggered for ${recipientPhone}`);
              } catch (chatbotError) {
                console.error('[CHATBOT] Error calling chatbot:', chatbotError);
              }
            }
          }
        }
      }
    }

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received', timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
