import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DietRequestNotification {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  goal: string;
  preferences?: string | null;
  tenant_id?: string;
}

const goalLabels: Record<string, string> = {
  emagrecer: "Emagrecer",
  "ganhar-massa": "Ganhar Massa",
  manter: "Manter Peso",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data: DietRequestNotification = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenantId = data.tenant_id || "00000000-0000-0000-0000-000000000001";

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("brand_name, whatsapp, admin_notify_phone, resend_api_key, resend_from_email")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      console.error("Tenant not found:", tenantId);
      return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const goalLabel = goalLabels[data.goal] || data.goal;
    const results: any = {};

    // === ATOMIC DEDUP: 1 notificação por cliente a cada 24h ===
    const { error: dedupError } = await supabase
      .from('notification_events')
      .insert({
        channel: 'email', event_type: 'sent', template_name: 'diet_request_notify',
        recipient_email: 'admin', metadata: { customer_phone: data.customer_phone, customer_name: data.customer_name },
      })
      .select('id')
      .single();

    if (dedupError?.code === '23505') {
      console.log(`[notify-diet-request] Skipping — already notified for ${data.customer_phone}`);
      return new Response(JSON.stringify({ success: true, skipped: true }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // --- WhatsApp notification to admin ---
    try {
      const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
      const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
      const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");
      const adminPhone = tenant.admin_notify_phone || tenant.whatsapp;

      if (evolutionApiKey && evolutionApiUrl && evolutionInstance && adminPhone) {
        const emailLine = data.customer_email ? `\n📧 *Email:* ${data.customer_email}` : "";
        const msg = `🥗 *NOVA SOLICITAÇÃO - Dieta Personalizada*\n\n👤 *Nome:* ${data.customer_name}\n📱 *Tel:* ${data.customer_phone}${emailLine}\n🎯 *Objetivo:* ${goalLabel}${data.preferences ? `\n📝 *Preferências:* ${data.preferences}` : ""}\n\nAcesse o painel para gerenciar.`;
        const wpResponse = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": evolutionApiKey },
          body: JSON.stringify({ number: adminPhone, text: msg }),
        });
        results.whatsapp = { sent: wpResponse.ok };
      } else {
        results.whatsapp = { skipped: "missing config" };
      }
    } catch (e) {
      results.whatsapp = { error: e.message };
    }

    // --- Email notification to admin ---
    try {
      const resendApiKey = tenant.resend_api_key || Deno.env.get("RESEND_API_KEY");
      const fromEmail = tenant.resend_from_email || "noreply@dietajavca.com.br";

      if (resendApiKey && fromEmail) {
        const resend = new Resend(resendApiKey);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f5f5f5;padding:24px;"><div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;"><div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:24px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:20px;">🥗 Dieta Personalizada</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">${tenant.brand_name||"DietaJá"}</p></div><div style="padding:24px;"><h2 style="margin:0 0 16px;">Nova solicitação!</h2><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#666;">👤 Nome</td><td style="padding:8px 0;font-weight:bold;">${data.customer_name}</td></tr><tr><td style="padding:8px 0;color:#666;">📱 Telefone</td><td style="padding:8px 0;font-weight:bold;">${data.customer_phone}</td></tr><tr><td style="padding:8px 0;color:#666;">🎯 Objetivo</td><td style="padding:8px 0;font-weight:bold;">${goalLabel}</td></tr>${data.preferences?`<tr><td style="padding:8px 0;color:#666;">📝 Preferências</td><td style="padding:8px 0;font-weight:bold;">${data.preferences}</td></tr>`:""}</table></div></div></body></html>`;

        const { error } = await resend.emails.send({
          from: `DietaJá <${fromEmail}>`,
          to: [tenant.resend_from_email || "kennedymylobo@gmail.com"],
          subject: `🥗 Nova Dieta Personalizada - ${data.customer_name}`,
          html,
        });
        results.email = { sent: !error, error: error?.message };
      } else {
        results.email = { skipped: "missing config" };
      }
    } catch (e) {
      results.email = { error: e.message };
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error in notify-diet-request:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
