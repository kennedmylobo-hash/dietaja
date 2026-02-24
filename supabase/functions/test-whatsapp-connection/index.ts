import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`\n========================================`);
  console.log(`[START] test-whatsapp-connection invoked at ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  try {
    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    console.log(`[CONFIG] Evolution API validation:`, {
      hasApiUrl: !!apiUrl,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      hasInstanceName: !!instanceName,
      instanceName,
    });

    if (!apiUrl || !apiKey || !instanceName) {
      const error = 'Evolution API credentials not configured';
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

    const testMessage = message || `✅ Teste de conexão WhatsApp (Evolution API)\n\n📱 WhatsApp funcionando!\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n🔗 Instância: ${instanceName}`;

    const result = await sendWhatsAppText(phone, testMessage, { apiUrl, apiKey, instanceName });

    if (!result.success) {
      console.error(`[ERROR] ❌ Send failed:`, result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error, response: result.response }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SUCCESS] ✅ Test message sent successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test message sent successfully via Evolution API',
        phone,
        messageId: result.messageId,
        response: result.response,
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
