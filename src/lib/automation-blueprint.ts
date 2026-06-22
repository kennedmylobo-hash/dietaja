/*
 * BLUEPRINT: Automações pós-entrega, recuperação de inativos e checkout abandonado
 *
 * Requer Evolution API integrada para disparo automático de WhatsApp.
 * Implementar após configurar EVOLUTION_API_URL + EVOLUTION_API_KEY.
 *
 * ─── 1. CHECKOUT ABANDONADO ───
 * Gatilho: order.status = 'whatsapp_pending' há mais de 30 min
 * Ação: Enviar WhatsApp com link para finalizar pedido
 * Edge Function: handle-abandoned-checkout (via cron ou webhook)
 * Query: SELECT * FROM orders WHERE status = 'whatsapp_pending' AND created_at < now() - interval '30 minutes'
 *
 * ─── 2. PÓS-ENTREGA ───
 * Gatilho: scheduled_date = ontem E order.status IN ('ready', 'delivered')
 * Ação: Enviar WhatsApp "Como foi sua experiência?" com link de avaliação
 * Edge Function: send-post-delivery-feedback
 * Template: "Olá {nome}, sua entrega de ontem foi bem? Adoraríamos saber sua opinião: {link_avaliacao}"
 *
 * ─── 3. REATIVAÇÃO DE INATIVOS ───
 * Gatilho: Último pedido há mais de 15 dias E perfil ativo
 * Ação: Enviar WhatsApp com oferta de reativação (desconto ou frete grátis)
 * Edge Function: send-reactivation-offer
 * Template: "Saudades, {nome}! Que tal {desconto}% de desconto no seu próximo pedido? Use o cupom {cupom}"
 *
 * ─── 4. ANIVERSÁRIO ───
 * Gatilho: Cliente faz aniversário hoje (profile.birthday = current_date)
 * Ação: Enviar WhatsApp com oferta especial
 *
 * ─── TABELAS NECESSÁRIAS (já devem existir) ───
 * - profiles: birthday, email, phone, name
 * - orders: status, customer_email, created_at, scheduled_date
 */

export const AUTOMATION_BLUEPRINT = {
  name: "Automações de Marketing",
  version: "1.0",
  requires: ["evolution_api"],
  features: [
    {
      id: "abandoned_checkout",
      name: "Checkout Abandonado",
      description: "Disparo automático 30min após pedido não finalizado via WhatsApp",
      trigger: "whatsapp_pending > 30min",
      priority: "high",
    },
    {
      id: "post_delivery",
      name: "Pós-entrega",
      description: "Solicitação de feedback 24h após data agendada de entrega",
      trigger: "scheduled_date = yesterday AND status IN (ready, delivered)",
      priority: "medium",
    },
    {
      id: "reactivation",
      name: "Reativação de Inativos",
      description: "Oferta personalizada para clientes sem pedido há 15+ dias",
      trigger: "last_order > 15 days",
      priority: "medium",
    },
    {
      id: "birthday",
      name: "Aniversário",
      description: "Oferta especial no dia do aniversário do cliente",
      trigger: "birthday = today",
      priority: "low",
    },
  ],
};
