-- Criar tabela de histórico de alterações de status
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para buscas por pedido
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- Habilitar RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view order status history"
ON public.order_status_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert order status history"
ON public.order_status_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;