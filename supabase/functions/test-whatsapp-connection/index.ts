import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
  message?: string;
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) return cleaned;
  return `55${cleaned}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`\n========================================`);
  console.log(`[START] test-whatsapp-connection invoked at ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  try {
    const apiToken = Deno.env.get('NOTIFICAME_API_TOKEN');
    const channelToken = Deno.env.get('NOTIFICAME_WHATSAPP_CHANNEL_TOKEN');

    console.log(`[CONFIG] Token validation:`, {
      hasApiToken: !!apiToken,
      apiTokenLength: apiToken?.length || 0,
      hasChannelToken: !!channelToken,
      channelTokenLength: channelToken?.length || 0,
    });

    if (!apiToken || !channelToken) {
      const error = 'NotificaMe tokens not configured';
      console.error(`[ERROR] ${error}`);
      return new Response(
        JSON.stringify({ success: false, error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { phone, message } = body;

    console.log(`[INPUT] Phone: ${phone}, Custom message: ${!!message}`);

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhone(phone);
    const testMessage = message || `✅ Teste de conexão Dieta Já\n\n📱 WhatsApp funcionando!\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

    const payload = {
      from: channelToken,
      to: formattedPhone,
      contents: [{
        type: "text",
        text: testMessage,
      }],
    };

    console.log(`[SEND] ========== SENDING TEST MESSAGE ==========`);
    console.log(`[SEND] Phone: ${formattedPhone}`);
    console.log(`[SEND] Message:`, testMessage);
    console.log(`[SEND] Full payload:`, JSON.stringify(payload, null, 2));
    console.log(`[SEND] API URL: https://api.notificame.com.br/v1/channels/whatsapp/messages`);

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Token': apiToken,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseData);
    } catch (e) {
      console.log(`[RESPONSE] Response is not JSON`);
    }

    const fullResponse = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      body: responseJson || responseData,
      headers: Object.fromEntries(response.headers.entries())
    };

    console.log(`[RESPONSE] ========== NOTIFICAME RESPONSE ==========`);
    console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
    console.log(`[RESPONSE] OK: ${response.ok}`);
    console.log(`[RESPONSE] Body:`, JSON.stringify(fullResponse.body, null, 2));
    console.log(`[RESPONSE] Headers:`, JSON.stringify(fullResponse.headers, null, 2));

    if (!response.ok) {
      console.error(`[ERROR] ❌ API ERROR`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData,
          response: fullResponse 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SUCCESS] ✅ Test message sent successfully to ${formattedPhone}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test message sent successfully',
        phone: formattedPhone,
        response: fullResponse 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERROR] ❌ Exception:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
