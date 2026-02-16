CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  max_seq INT;
BEGIN
  -- Serializa a geracao de order_number por tenant
  PERFORM pg_advisory_xact_lock(hashtext('order_number_' || NEW.tenant_id::text));

  SELECT t.order_prefix INTO prefix
  FROM public.tenants t
  WHERE t.id = NEW.tenant_id;

  IF prefix IS NULL THEN
    prefix := 'DJA';
  END IF;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(order_number, '^.*-', ''), '')::INT),
    0
  ) + 1
  INTO max_seq
  FROM public.orders
  WHERE tenant_id = NEW.tenant_id;

  NEW.order_number := prefix || '-' || LPAD(max_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;