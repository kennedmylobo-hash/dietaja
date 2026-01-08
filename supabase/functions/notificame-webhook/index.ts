import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Log specific fields if they exist
    if (parsedBody) {
      if (parsedBody.status) console.log('Status:', parsedBody.status);
      if (parsedBody.messageId) console.log('Message ID:', parsedBody.messageId);
      if (parsedBody.to) console.log('To:', parsedBody.to);
      if (parsedBody.error) console.log('Error:', parsedBody.error);
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
