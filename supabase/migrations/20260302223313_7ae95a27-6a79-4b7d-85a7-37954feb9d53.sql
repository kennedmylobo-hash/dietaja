ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS recovery_stage integer NOT NULL DEFAULT 0;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS last_recovery_at timestamptz;