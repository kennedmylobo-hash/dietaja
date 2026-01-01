-- Tabela de pedidos para rastreamento de pagamentos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'pix',
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  delivery_fee NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_option TEXT NOT NULL,
  delivery_address TEXT,
  utm_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Permitir inserção pública (para criar pedidos)
CREATE POLICY "Anyone can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Admins podem ver todos os pedidos
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar pedidos
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar index para busca por preference_id (usado pelo webhook)
CREATE INDEX idx_orders_mp_preference_id ON public.orders(mp_preference_id);

-- Criar index para busca por status
CREATE INDEX idx_orders_status ON public.orders(status);