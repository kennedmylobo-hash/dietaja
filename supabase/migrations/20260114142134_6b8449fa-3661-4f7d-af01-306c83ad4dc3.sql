-- Fase 1: Cancelar pedidos órfãos antigos (sem mp_payment_id, mais de 1 hora)
UPDATE orders 
SET status = 'cancelled'
WHERE status IN ('pending', 'awaiting_payment')
  AND mp_payment_id IS NULL
  AND created_at < NOW() - INTERVAL '1 hour';