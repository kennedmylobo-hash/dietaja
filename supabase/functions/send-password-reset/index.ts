import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding } from "../_shared/tenant-branding.ts";
import { getPlatformUrl } from "../_shared/platform-config.ts";
import { getEmailCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordResetRequest {
  email: string;
  tenant_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Password reset request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tenant_id }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    console.log(`Processing password reset for email: ${email}, tenant_id: ${tenant_id || "none"}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Resolve tenant_id from the admin's email if not provided
    let resolvedTenantId = tenant_id;
    if (!resolvedTenantId) {
      // Look up the user's role to find their tenant
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
      const user = userData?.users?.find(u => u.email === email);
      if (user) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        resolvedTenantId = roleData?.tenant_id;
      }
    }

    // Fetch tenant branding for dynamic email content
    const branding = await getTenantBranding(supabaseAdmin, resolvedTenantId);
    const emailCreds = await getEmailCredentials(supabaseAdmin, resolvedTenantId);
    console.log(`Using branding: ${branding.brand_name} (slug: ${branding.slug})`);

    // Always redirect to the platform domain with ?tenant=slug
    const redirectTo = getPlatformUrl("/admin/reset-password", branding.slug);
    console.log(`Redirect URL: ${redirectTo}`);

    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
    }

    if (data?.properties?.action_link) {
      const resetLink = data.properties.action_link;
      console.log("Reset link generated successfully");

      const color = branding.primary_color || "#22c55e";

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background: ${color}; border-radius: 50%; margin: 0 auto 20px;">
                <span style="font-size: 28px; line-height: 60px;">🍽️</span>
              </div>
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                ${branding.brand_name}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 16px; color: #333; font-size: 20px; font-weight: 600; text-align: center;">
                Redefinir sua senha
              </h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 15px; line-height: 1.6; text-align: center;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${branding.brand_name}</strong>. Clique no botão abaixo para criar uma nova senha.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${resetLink}" 
                       style="display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <div style="background-color: #fff8e1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #856404; font-size: 13px; text-align: center;">
                  ⏰ Este link expira em <strong>1 hora</strong>
                </p>
              </div>
              
              <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5; text-align: center;">
                Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. Sua senha não será alterada.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                Precisa de ajuda? Entre em contato pelo WhatsApp ${branding.whatsapp_formatted}
              </p>
              <p style="margin: 8px 0 0; color: #bbb; font-size: 11px; text-align: center;">
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
          Authorization: `Bearer ${emailCreds.apiKey}`,
        },
        body: JSON.stringify({
          from: `${branding.brand_name} <${emailCreds.fromEmail}>`,
          to: [email],
          subject: `Redefinir sua senha - ${branding.brand_name}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error("Resend error:", errorData);
      } else {
        console.log("Email sent successfully");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Se o email estiver cadastrado, você receberá um link de recuperação." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Se o email estiver cadastrado, você receberá um link de recuperação." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
