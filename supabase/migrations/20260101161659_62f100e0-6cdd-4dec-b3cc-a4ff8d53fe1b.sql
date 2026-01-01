-- Tabela de leads capturados no quiz
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT,
  objective TEXT,
  specification TEXT,
  recommendation_type TEXT,
  recommendation_name TEXT,
  recommendation_price DECIMAL(10,2),
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de eventos de analytics
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page TEXT,
  section TEXT,
  scroll_depth INTEGER,
  time_on_page INTEGER,
  referrer TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Políticas para inserção pública (anônima) - necessário para captura de leads
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert analytics"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type);

-- Tabela de roles para admin
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas para leitura de leads (apenas admins)
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para leitura de analytics (apenas admins)
CREATE POLICY "Admins can view all analytics"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));