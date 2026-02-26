ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_notify_phone text DEFAULT NULL;

UPDATE public.tenants SET admin_notify_phone = '5577991038866' WHERE id = '00000000-0000-0000-0000-000000000001';