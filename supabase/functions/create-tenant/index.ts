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
    const { brand_name, slug, city, state, whatsapp, admin_email, admin_password, plan_type, primary_color, clone_menu_from } = body;

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

    // 6. Clone menu from source tenant OR seed defaults
    if (clone_menu_from) {
      console.log(`Cloning menu from tenant: ${clone_menu_from}`);
      await cloneMenuFromTenant(supabase, clone_menu_from, tenant.id);
    } else {
      // Seed default menu categories
      const defaultCategories = [
        { name: "Marmitas Emagrecimento", short_name: "Emagrecimento", slug: "emagrecimento", type: "marmita", icon: "🥗", sort_order: 1, tenant_id: tenant.id },
        { name: "Marmitas Ganho de Massa", short_name: "Ganho Massa", slug: "ganho-massa", type: "marmita", icon: "💪", sort_order: 2, tenant_id: tenant.id },
        { name: "Kits Detox", short_name: "Detox", slug: "detox", type: "kit", icon: "🥤", sort_order: 3, tenant_id: tenant.id },
      ];

      const { error: catError } = await supabase.from("menu_categories").insert(defaultCategories);
      if (catError) {
        console.error("Error seeding categories:", catError);
      }
    }

    // 7. Seed default landing content
    await seedLandingContent(supabase, tenant.id, brand_name, clone_menu_from);

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

/**
 * Clone all menu data from a source tenant to a new tenant.
 */
async function cloneMenuFromTenant(supabase: any, sourceTenantId: string, newTenantId: string) {
  const tables = [
    { name: "menu_categories", exclude: ["id", "created_at", "updated_at"] },
    { name: "marmita_packages", exclude: ["id", "created_at", "updated_at"] },
    { name: "marmita_flavors", exclude: ["id", "created_at"] },
    { name: "marmita_sides", exclude: ["id", "created_at"] },
    { name: "kit_packages", exclude: ["id", "created_at", "updated_at"] },
    { name: "kit_soups", exclude: ["id", "created_at"] },
    { name: "kit_juices", exclude: ["id", "created_at"] },
    { name: "loyalty_levels", exclude: ["id", "created_at", "updated_at"] },
    { name: "club_plans", exclude: ["id", "created_at", "updated_at"] },
  ];

  for (const table of tables) {
    try {
      const { data: sourceRows, error: fetchError } = await supabase
        .from(table.name)
        .select("*")
        .eq("tenant_id", sourceTenantId);

      if (fetchError) { console.error(`Error fetching ${table.name}:`, fetchError); continue; }
      if (!sourceRows || sourceRows.length === 0) { console.log(`No rows to clone for ${table.name}`); continue; }

      const clonedRows = sourceRows.map((row: any) => {
        const cloned = { ...row, tenant_id: newTenantId };
        for (const field of table.exclude) { delete cloned[field]; }
        return cloned;
      });

      const { error: insertError } = await supabase.from(table.name).insert(clonedRows);
      if (insertError) { console.error(`Error cloning ${table.name}:`, insertError); }
      else { console.log(`Cloned ${clonedRows.length} rows for ${table.name}`); }
    } catch (err) {
      console.error(`Unexpected error cloning ${table.name}:`, err);
    }
  }
}

/**
 * Seed default landing page content for a new tenant.
 * If cloning from a source, copy its landing content too.
 */
async function seedLandingContent(supabase: any, tenantId: string, brandName: string, cloneFrom?: string) {
  if (cloneFrom) {
    const { data: sourceContent } = await supabase
      .from("tenant_landing_content")
      .select("*")
      .eq("tenant_id", cloneFrom);

    if (sourceContent && sourceContent.length > 0) {
      const cloned = sourceContent.map((row: any) => ({
        tenant_id: tenantId,
        section_key: row.section_key,
        content: row.content,
        is_visible: row.is_visible,
        sort_order: row.sort_order,
      }));
      const { error } = await supabase.from("tenant_landing_content").insert(cloned);
      if (error) console.error("Error cloning landing content:", error);
      else console.log(`Cloned ${cloned.length} landing sections`);
      return;
    }
  }

  // Default seed
  const defaults = [
    { section_key: "hero", sort_order: 1, content: { title: `${brandName} — Alimentação saudável sem esforço`, subtitle: "Marmitas, kits detox e dietas personalizadas", badges: ["Retirada grátis", "Produção semanal"], social_proof: "200+ kits vendidos" } },
    { section_key: "identification", sort_order: 2, content: { title: "Você não come mal porque quer.", items: ["Você come mal porque carrega muita coisa nas costas.", "Aqui, a alimentação deixa de ser mais uma preocupação."] } },
    { section_key: "before_after", sort_order: 4, content: { title: "Como muda a sua rotina", subtitle: "Veja a diferença que ter alimentação saudável pronta faz no seu dia a dia", before: [{ icon: "Clock", text: "Sem tempo pra cozinhar" }, { icon: "Pizza", text: "Delivery todo dia" }, { icon: "BatteryLow", text: "Cansada e sem energia" }, { icon: "CircleDollarSign", text: "Gastando demais com comida" }, { icon: "Frown", text: "Culpa por não cuidar de si" }], after: [{ icon: "Clock", text: "Refeições prontas esperando" }, { icon: "Salad", text: "Comida saudável e saborosa" }, { icon: "BatteryFull", text: "Energia pro dia todo" }, { icon: "PiggyBank", text: "Economia no fim do mês" }, { icon: "Smile", text: "Orgulho do autocuidado" }] } },
    { section_key: "product_gallery", sort_order: 5, content: { title: "O que você recebe", badge: "🌿 Produto Real", badges: [{ icon: "Droplet", label: "Sucos detox" }, { icon: "Flame", label: "Sopas funcionais" }, { icon: "UtensilsCrossed", label: "Marmitas congeladas" }, { icon: "MapPin", label: "Produção local" }], footer: "Produção semanal" } },
    { section_key: "banners", sort_order: 3, content: { title: "O que você deseja? 🤔", subtitle: "Escolha uma opção abaixo", items: [{ id: "kit-detox", title: "Kit Detox", subtitle: "Comece sua transformação", description: "Sucos + sopas", icon: "Droplets", gradient: "from-primary/90 to-primary", targetSection: "kits" }, { id: "marmitas", title: "Marmitas Saudáveis", subtitle: "Combos com desconto", description: "7 a 28 marmitas", icon: "UtensilsCrossed", gradient: "from-terracotta/90 to-terracotta", targetSection: "marmitas" }, { id: "dieta", title: "Dieta Personalizada", subtitle: "Montamos para você", description: "Sua dieta, nossa mão de obra", icon: "Salad", gradient: "from-sage-dark/90 to-sage-dark", targetSection: "dieta-personalizada" }] } },
    { section_key: "faq", sort_order: 8, content: { items: [{ question: "Como funciona a entrega?", answer: "Entregamos semanalmente na sua região." }, { question: "Posso cancelar a qualquer momento?", answer: "Sim, sem compromisso." }] } },
    { section_key: "custom_diet", sort_order: 9, content: { title: "Quer algo ainda mais personalizado?", subtitle: "Montamos sua dieta sob medida.", button_text: "Montar minha dieta personalizada", benefits: [{ icon: "ClipboardList", text: "Siga sua dieta médica ou nutricional" }, { icon: "Heart", text: "Adapte para suas restrições alimentares" }, { icon: "ChefHat", text: "Escolha exatamente os ingredientes" }] } },
  ];

  const rows = defaults.map((d) => ({ tenant_id: tenantId, ...d }));
  const { error } = await supabase.from("tenant_landing_content").insert(rows);
  if (error) console.error("Error seeding landing content:", error);
  else console.log(`Seeded ${rows.length} landing sections for ${brandName}`);
}
  }
}
