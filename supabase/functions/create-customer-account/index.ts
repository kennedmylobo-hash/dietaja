import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  name: string;
  phone?: string;
  deliveryOption?: string;
  address?: string;
  tenant_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client to manage users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, name, phone, deliveryOption, address, tenant_id }: RequestBody = await req.json();
    const effectiveTenantId = tenant_id || '00000000-0000-0000-0000-000000000001';

    console.log("Creating account for:", email);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw new Error("Erro ao verificar usuário existente");
    }

    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      userId = existingUser.id;

      // Update profile if exists
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          user_id: userId,
          name,
          email,
          phone: phone || null,
          preferred_delivery_option: deliveryOption || null,
          preferred_address: address || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }

      // Send magic link for existing user
      const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}/`,
        },
      });

      if (magicLinkError) {
        console.error("Error generating magic link:", magicLinkError);
        // Don't throw - user is already created
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Conta já existe! Enviamos um link de acesso para seu email.",
          isExisting: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...buildCorsHeaders(req) },
        }
      );
    }

    // Create new user with a random password (they'll use magic link)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        phone,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error("Erro ao criar conta");
    }

    userId = newUser.user.id;
    console.log("Created new user:", userId);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        name,
        email,
        phone: phone || null,
        preferred_delivery_option: deliveryOption || null,
        preferred_address: address || null,
        tenant_id: effectiveTenantId,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't throw - user is created, profile is optional
    }

    // Send magic link email for first access
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get("origin") || supabaseUrl}/`,
    });

    if (inviteError) {
      console.error("Error sending invite:", inviteError);
      // Try alternative: generate magic link
      const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}/`,
        },
      });

      if (magicLinkError) {
        console.error("Error generating magic link:", magicLinkError);
      }
    }

    console.log("Account created successfully for:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta criada! Enviamos um link de acesso para seu email.",
        isExisting: false,
        userId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...buildCorsHeaders(req) },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in create-customer-account:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...buildCorsHeaders(req) },
      }
    );
  }
});
