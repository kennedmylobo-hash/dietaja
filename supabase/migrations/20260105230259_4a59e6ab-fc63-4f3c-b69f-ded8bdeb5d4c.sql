-- Create marketing_messages table for configurable message templates
CREATE TABLE public.marketing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type text NOT NULL UNIQUE,
  title text NOT NULL,
  whatsapp_template text NOT NULL,
  email_subject text NOT NULL,
  email_body_html text NOT NULL,
  is_active boolean DEFAULT true,
  delay_days integer DEFAULT 0,
  trigger_quantity integer,
  coupon_code text,
  discount_percent integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can manage marketing messages
CREATE POLICY "Admins can manage marketing messages"
ON public.marketing_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active messages (for edge functions)
CREATE POLICY "Anyone can view active marketing messages"
ON public.marketing_messages
FOR SELECT
USING (true);

-- Create recompra_campaigns table to track sent campaigns
CREATE TABLE public.recompra_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  coupon_used boolean DEFAULT false,
  UNIQUE(order_id, message_type)
);

-- Enable RLS
ALTER TABLE public.recompra_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can view campaigns
CREATE POLICY "Admins can view recompra campaigns"
ON public.recompra_campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert campaigns (for edge functions)
CREATE POLICY "Service role can insert recompra campaigns"
ON public.recompra_campaigns
FOR INSERT
WITH CHECK (true);

-- Add review_requested_at column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_requested_at timestamp with time zone;

-- Add delivered_at column to orders for tracking delivery time
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Create trigger to update updated_at
CREATE TRIGGER update_marketing_messages_updated_at
BEFORE UPDATE ON public.marketing_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default marketing messages
INSERT INTO public.marketing_messages (message_type, title, whatsapp_template, email_subject, email_body_html, delay_days, trigger_quantity, coupon_code, discount_percent) VALUES
-- Status messages
('status_approved', 'Pagamento Aprovado', 
'✅ *Pagamento Confirmado!*

Oi {nome}! Seu pedido *#{pedido}* foi aprovado com sucesso!

💰 Total: R$ {total}
📦 Previsão de entrega: até 3 dias úteis

Vamos começar a preparar suas marmitas com muito carinho! 💚

Acompanhe o status: {link}', 
'✅ Pagamento Confirmado - Pedido #{pedido}',
'<h1>Pagamento Confirmado!</h1><p>Seu pedido #{pedido} foi aprovado.</p>', 0, NULL, NULL, NULL),

('status_preparing', 'Em Produção',
'👨‍🍳 *Suas marmitas estão sendo preparadas!*

Oi {nome}! Seu pedido *#{pedido}* já está na cozinha!

Estamos preparando tudo fresquinho pra você! 🥗

Acompanhe: {link}',
'👨‍🍳 Seu pedido #{pedido} está sendo preparado!',
'<h1>Em Produção!</h1><p>Suas marmitas estão sendo preparadas com carinho.</p>', 0, NULL, NULL, NULL),

('status_ready', 'Pronto para Entrega',
'📦 *Pedido Pronto!*

Oi {nome}! Seu pedido *#{pedido}* está prontinho!

Aguardando a entrega ou retirada. 🚀

Acompanhe: {link}',
'📦 Seu pedido #{pedido} está pronto!',
'<h1>Pedido Pronto!</h1><p>Suas marmitas estão prontas e aguardando.</p>', 0, NULL, NULL, NULL),

('status_delivering', 'Saiu para Entrega',
'🛵 *Pedido a Caminho!*

Oi {nome}! Seu pedido *#{pedido}* saiu para entrega!

Em breve estará nas suas mãos! 📍

Acompanhe: {link}',
'🛵 Seu pedido #{pedido} saiu para entrega!',
'<h1>A Caminho!</h1><p>Seu pedido está sendo entregue agora.</p>', 0, NULL, NULL, NULL),

('status_delivered', 'Entregue',
'✅ *Pedido Entregue!*

Oi {nome}! Seu pedido *#{pedido}* foi entregue com sucesso!

Esperamos que aproveite suas marmitas! 💚

Bom apetite! 🍽️',
'✅ Pedido #{pedido} entregue com sucesso!',
'<h1>Pedido Entregue!</h1><p>Bom apetite!</p>', 0, NULL, NULL, NULL),

('status_cancelled', 'Cancelado',
'😢 *Pedido Cancelado*

Oi {nome}, infelizmente seu pedido *#{pedido}* foi cancelado.

Se precisar de algo, estamos aqui! 💚',
'😢 Pedido #{pedido} cancelado',
'<h1>Pedido Cancelado</h1><p>Sentimos muito pelo cancelamento.</p>', 0, NULL, NULL, NULL),

-- Review request
('review_request', 'Pedir Avaliação',
'⭐ *Como foi sua experiência?*

Oi {nome}! Já se passaram alguns dias desde que você recebeu seu pedido *#{pedido}*.

Gostaríamos muito de saber o que achou das marmitas! Sua opinião é super importante pra gente! 💚

Pode responder aqui mesmo! ⭐⭐⭐⭐⭐',
'⭐ {nome}, como foram suas marmitas?',
'<h1>Conta pra gente!</h1><p>Como foi sua experiência com as marmitas?</p>', 1, NULL, NULL, NULL),

-- Recompra campaigns
('recompra_5', 'Recompra 5 Marmitas',
'🥗 *{nome}, já está na hora de renovar!*

Faz 6 dias que você recebeu suas marmitas e apostamos que já estão acabando! 😋

Que tal garantir mais uma semana de alimentação saudável?

🎁 Use o cupom *{cupom}* e ganhe *{desconto}% OFF* no próximo pedido!

É só acessar: {link}',
'🎁 {nome}, seu cupom de {desconto}% OFF está esperando!',
'<h1>Hora de renovar!</h1><p>Use o cupom {cupom} e ganhe {desconto}% de desconto!</p>', 6, 5, 'VOLTA10', 10),

('recompra_14', 'Recompra 14 Marmitas',
'🥗 *{nome}, sentimos sua falta!*

Já faz quase 2 semanas desde seu último pedido de marmitas.

Sabemos que manter a rotina saudável é difícil, mas estamos aqui pra te ajudar! 💪

🎁 Cupom exclusivo: *{cupom}* = *{desconto}% OFF*

Garanta agora: {link}',
'🎁 {nome}, cupom exclusivo de {desconto}% só pra você!',
'<h1>Sentimos sua falta!</h1><p>Cupom exclusivo {cupom} com {desconto}% OFF!</p>', 12, 14, 'VOLTA10', 10),

('recompra_28', 'Recompra 28 Marmitas',
'🥗 *{nome}, temos uma surpresa!*

Você é um cliente especial que comprou nosso pacote mensal! 🌟

Como agradecimento, preparamos um cupom VIP só pra você:

🎁 *{cupom}* = *{desconto}% OFF* no próximo mês!

Renove sua alimentação saudável: {link}',
'🌟 {nome}, cupom VIP de {desconto}% para clientes especiais!',
'<h1>Você é VIP!</h1><p>Cupom especial {cupom} com {desconto}% OFF!</p>', 25, 28, 'VIP15', 15);

-- Enable realtime for marketing_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_messages;