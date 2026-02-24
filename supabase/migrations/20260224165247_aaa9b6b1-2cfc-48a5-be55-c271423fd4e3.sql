
-- Tabela de tokens únicos por cliente mensalista
CREATE TABLE public.client_feedback_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  recurring_customer_id uuid REFERENCES public.recurring_customers(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_feedback_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feedback tokens"
  ON public.client_feedback_tokens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

CREATE POLICY "Anyone can view active tokens"
  ON public.client_feedback_tokens FOR SELECT
  USING (is_active = true);

-- Tabela de feedbacks semanais
CREATE TABLE public.client_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  token_id uuid REFERENCES public.client_feedback_tokens(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  liked_items text,
  disliked_items text,
  observations text,
  photo_urls jsonb DEFAULT '[]'::jsonb,
  week_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feedbacks"
  ON public.client_feedbacks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

CREATE POLICY "Anyone can insert feedbacks"
  ON public.client_feedbacks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view feedbacks by token"
  ON public.client_feedbacks FOR SELECT
  USING (true);

-- Bucket para fotos de feedback
INSERT INTO storage.buckets (id, name, public) VALUES ('client-feedback-photos', 'client-feedback-photos', true);

CREATE POLICY "Anyone can upload feedback photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-feedback-photos');

CREATE POLICY "Anyone can view feedback photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-feedback-photos');
