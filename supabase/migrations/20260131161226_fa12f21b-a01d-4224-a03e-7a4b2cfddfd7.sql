-- Clientes autenticados podem ver seus próprios pedidos (por email vinculado ao perfil)
CREATE POLICY "Customers can view their own orders by email"
ON public.orders FOR SELECT
TO authenticated
USING (
  customer_email = (
    SELECT email FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);