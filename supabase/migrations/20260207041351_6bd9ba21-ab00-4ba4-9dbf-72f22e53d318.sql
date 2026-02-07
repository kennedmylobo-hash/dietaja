
-- Add integration credential columns to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS asaas_api_key text,
  ADD COLUMN IF NOT EXISTS asaas_webhook_token text,
  ADD COLUMN IF NOT EXISTS notificame_api_token text,
  ADD COLUMN IF NOT EXISTS notificame_channel_token text,
  ADD COLUMN IF NOT EXISTS resend_api_key text,
  ADD COLUMN IF NOT EXISTS resend_from_email text;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.asaas_api_key IS 'Chave API do Asaas do tenant (nullable = usa global)';
COMMENT ON COLUMN public.tenants.asaas_webhook_token IS 'Token webhook Asaas do tenant';
COMMENT ON COLUMN public.tenants.notificame_api_token IS 'Token API NotificaMe do tenant';
COMMENT ON COLUMN public.tenants.notificame_channel_token IS 'Token canal WhatsApp NotificaMe do tenant';
COMMENT ON COLUMN public.tenants.resend_api_key IS 'Chave API Resend do tenant';
COMMENT ON COLUMN public.tenants.resend_from_email IS 'Email remetente do tenant (ex: pedidos@marca.com.br)';
