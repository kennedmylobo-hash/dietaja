import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlatformUrl } from "../_shared/platform-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, tenant_id, brand_name, primary_color, tenant_slug, tenant_domain } = await req.json();

    if (!email || !tenant_id || !brand_name) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = tenant_slug || "dietaja";
    console.log(`Generating invite link for ${email} (tenant: ${brand_name}, slug: ${slug})`);

    // Always use platform domain with ?tenant=slug for admin access
    const redirectTo = getPlatformUrl("/admin/reset-password", slug);
    console.log(`Redirect URL: ${redirectTo}`);

    // Use "recovery" type since user was already created by create-tenant
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("Error generating invite link:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteLink = data?.properties?.action_link;
    if (!inviteLink) {
      return new Response(JSON.stringify({ error: "Falha ao gerar link de convite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log invite link to console for manual fallback
    console.log("=== INVITE LINK (copy if email doesn't arrive) ===");
    console.log(inviteLink);
    console.log("=================================================");
    console.log("Invite link generated, sending email...");

    const color = primary_color || "#22c55e";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background: ${color}; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px; line-height: 60px;">🍽️</span>
              </div>
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                ${brand_name}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 16px; color: #333; font-size: 20px; font-weight: 600; text-align: center;">
                Bem-vindo ao seu painel!
              </h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 15px; line-height: 1.6; text-align: center;">
                Sua conta no <strong>${brand_name}</strong> foi criada com sucesso. Clique no botão abaixo para criar sua senha e acessar o painel administrativo.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${inviteLink}" style="display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                      Criar minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fff8e1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #856404; font-size: 13px; text-align: center;">
                  ⏰ Este link expira em <strong>24 horas</strong>
                </p>
              </div>
              <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5; text-align: center;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #bbb; font-size: 11px; text-align: center;">
                PedidoJá — Plataforma de gestão de restaurantes
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `PedidoJá <pedidos@dietajavca.com.br>`,
        to: [email],
        subject: `Bem-vindo ao ${brand_name} — Crie sua senha`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend error:", errorData);
      return new Response(JSON.stringify({ error: "Erro ao enviar email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Invite email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in send-tenant-invite:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
