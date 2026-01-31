-- Create loyalty levels configuration table
CREATE TABLE public.loyalty_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  min_orders integer NOT NULL DEFAULT 0,
  min_spent numeric NOT NULL DEFAULT 0,
  cashback_percent numeric NOT NULL DEFAULT 3,
  emoji text NOT NULL DEFAULT '🥉',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cashback balances table (one per customer email)
CREATE TABLE public.cashback_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email text NOT NULL UNIQUE,
  current_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_used numeric NOT NULL DEFAULT 0,
  total_expired numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  current_level_id uuid REFERENCES public.loyalty_levels(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cashback transactions table
CREATE TABLE public.cashback_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  transaction_type text NOT NULL, -- 'earned', 'used', 'expired'
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  expires_at timestamp with time zone, -- only for 'earned' type
  expired boolean NOT NULL DEFAULT false,
  level_slug text, -- level at time of earning
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

-- Loyalty levels policies (anyone can view, admins can manage)
CREATE POLICY "Anyone can view active loyalty levels" 
ON public.loyalty_levels FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage loyalty levels" 
ON public.loyalty_levels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Cashback balances policies
CREATE POLICY "Users can view their own balance" 
ON public.cashback_balances FOR SELECT 
USING (customer_email = (SELECT email FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all balances" 
ON public.cashback_balances FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage balances" 
ON public.cashback_balances FOR ALL USING (true);

-- Cashback transactions policies
CREATE POLICY "Users can view their own transactions" 
ON public.cashback_transactions FOR SELECT 
USING (customer_email = (SELECT email FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all transactions" 
ON public.cashback_transactions FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert transactions" 
ON public.cashback_transactions FOR INSERT WITH CHECK (true);

-- Insert default loyalty levels
INSERT INTO public.loyalty_levels (name, slug, min_orders, min_spent, cashback_percent, emoji, sort_order) VALUES
('Bronze', 'bronze', 0, 0, 3, '🥉', 0),
('Prata', 'prata', 3, 500, 5, '🥈', 1),
('Ouro', 'ouro', 7, 1000, 8, '🥇', 2);

-- Create indexes for performance
CREATE INDEX idx_cashback_balances_email ON public.cashback_balances(customer_email);
CREATE INDEX idx_cashback_transactions_email ON public.cashback_transactions(customer_email);
CREATE INDEX idx_cashback_transactions_expires ON public.cashback_transactions(expires_at) WHERE expired = false AND transaction_type = 'earned';

-- Add trigger for updated_at
CREATE TRIGGER update_loyalty_levels_updated_at
BEFORE UPDATE ON public.loyalty_levels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cashback_balances_updated_at
BEFORE UPDATE ON public.cashback_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();