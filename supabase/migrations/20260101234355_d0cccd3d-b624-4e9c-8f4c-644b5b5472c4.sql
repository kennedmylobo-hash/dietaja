-- Habilitar REPLICA IDENTITY FULL para capturar dados completos em updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Adicionar tabela ao publication de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;