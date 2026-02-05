-- Criar tabela para clientes recorrentes
CREATE TABLE public.recurring_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_day TEXT NOT NULL CHECK (delivery_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  default_order TEXT NOT NULL,
  delivery_option TEXT NOT NULL DEFAULT 'delivery' CHECK (delivery_option IN ('delivery', 'retirada')),
  delivery_address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.recurring_customers ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança - apenas admins podem gerenciar
CREATE POLICY "Admins can manage recurring customers"
ON public.recurring_customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Índice para busca por dia da semana
CREATE INDEX idx_recurring_customers_delivery_day ON public.recurring_customers(delivery_day);
CREATE INDEX idx_recurring_customers_is_active ON public.recurring_customers(is_active);