-- Insert new marketing message templates for order WhatsApp notifications
INSERT INTO public.marketing_messages (message_type, title, whatsapp_template, email_subject, email_body_html, is_active, delay_days)
VALUES 
  ('order_pix_pending', 'Pedido PIX - Aguardando', 
   '🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! Seu pedido foi registrado com sucesso.

📋 *ITENS:*
{itens}

💰 *Subtotal:* R$ {subtotal}
{taxa_entrega}
{desconto}
💵 *TOTAL:* R$ {total}

{entrega}

⏳ *STATUS:* Aguardando Pagamento

────────────────
💳 *PAGUE VIA PIX:*

Copie o código abaixo e cole no app do seu banco:

```{pix_code}```

⚠️ Válido por 30 minutos
────────────────

Dúvidas? Responda esta mensagem! 💚',
   'Pedido #{pedido} - Aguardando Pagamento PIX',
   '<p>Aguardando pagamento PIX</p>',
   true, 0),
   
  ('order_whatsapp_pending', 'Pedido WhatsApp - Aguardando',
   '🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! Seu pedido foi registrado.

📋 *ITENS:*
{itens}

💰 *Subtotal:* R$ {subtotal}
{taxa_entrega}
{desconto}
💵 *TOTAL:* R$ {total}

{entrega}

⏳ *STATUS:* Reservado - Aguardando Pagamento

────────────────
📱 Para confirmar seu pedido, realize o pagamento via:
• PIX
• Transferência
• Dinheiro na entrega (consulte)

Responda esta mensagem para combinar! 💚
────────────────',
   'Pedido #{pedido} - Aguardando Pagamento',
   '<p>Aguardando pagamento via WhatsApp</p>',
   true, 0),
   
  ('order_confirmed', 'Pedido Confirmado - Pago',
   '🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! 🎉

✅ *PAGAMENTO CONFIRMADO!*

📋 *ITENS:*
{itens}

💰 *Subtotal:* R$ {subtotal}
{taxa_entrega}
{desconto}
💵 *TOTAL PAGO:* R$ {total}

{entrega}
📦 Entrega prevista em até 3 dias úteis

Seu pedido já está sendo preparado! 👨‍🍳

Acompanhe o status: {link}

Obrigado pela preferência! 💚',
   'Pedido #{pedido} Confirmado!',
   '<p>Pagamento confirmado</p>',
   true, 0)
ON CONFLICT (message_type) DO NOTHING;