import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { brand_name, slug, city, state, whatsapp, admin_email, admin_password, plan_type, primary_color } = body;

    if (!brand_name || !slug || !admin_email || !admin_password) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating tenant: ${brand_name} (${slug})`);

    // 1. Get plan price
    const planPrices: Record<string, number> = { basico: 99, pro: 199, premium: 299, free: 0 };
    const planPrice = planPrices[plan_type] || 99;

    // 2. Create admin user
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${userError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User created: ${newUser.user.id}`);

    // 3. Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        slug,
        brand_name,
        brand_slogan: "",
        primary_color: primary_color || "#22c55e",
        city: city || "",
        state: state || "",
        whatsapp: whatsapp || "",
        whatsapp_formatted: "",
        plan_type,
        plan_price: planPrice,
        plan_status: "active",
        owner_user_id: newUser.user.id,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      // Cleanup: delete the user we just created
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: `Erro ao criar tenant: ${tenantError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Tenant created: ${tenant.id}`);

    // 4. Create profile with tenant_id
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: newUser.user.id,
        email: admin_email,
        name: brand_name,
        tenant_id: tenant.id,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // 5. Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 6. Seed default menu categories for the new tenant
    const defaultCategories = [
      { name: "Marmitas Emagrecimento", short_name: "Emagrecimento", slug: "emagrecimento", type: "marmita", icon: "🥗", sort_order: 1, tenant_id: tenant.id },
      { name: "Marmitas Ganho de Massa", short_name: "Ganho Massa", slug: "ganho-massa", type: "marmita", icon: "💪", sort_order: 2, tenant_id: tenant.id },
      { name: "Kits Detox", short_name: "Detox", slug: "detox", type: "kit", icon: "🥤", sort_order: 3, tenant_id: tenant.id },
    ];

    const { error: catError } = await supabase.from("menu_categories").insert(defaultCategories);
    if (catError) {
      console.error("Error seeding categories:", catError);
    }

    console.log(`Onboarding complete for ${brand_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        admin_user_id: newUser.user.id,
        message: `Restaurante ${brand_name} criado com sucesso!`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
