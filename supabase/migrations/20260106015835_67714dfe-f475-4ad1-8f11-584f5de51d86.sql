-- Remover a política atual de SELECT
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Criar nova política que permite admins ver tudo E qualquer um ver pedidos recentes (5 min)
CREATE POLICY "View orders policy" 
ON public.orders 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  created_at > now() - interval '5 minutes'
);