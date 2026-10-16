-- "A vencer" (status 'expiring' do contrato e tag do cliente) só faz sentido
-- para contrato RECORRENTE: é o aviso de que uma mensalidade vai acabar e
-- precisa de renovação. Contrato pontual / rescisão tem fim por natureza —
-- fica 'active' até a última data e depois 'inactive', sem passar por
-- "a vencer" e sem marcar o cliente.

CREATE OR REPLACE FUNCTION public.update_client_tags_from_contracts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_record RECORD;
  best_status   TEXT;
  today_date    DATE := CURRENT_DATE;
  in_30_days    DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  FOR client_record IN
    SELECT DISTINCT c.id, c.user_id
    FROM public.clients c
    INNER JOIN public.contracts ct ON ct.client_id = c.id
  LOOP
    SELECT CASE
      -- Ativo: algum contrato com fim depois de 30 dias
      WHEN EXISTS (
        SELECT 1 FROM public.contracts
        WHERE client_id = client_record.id AND status != 'inactive' AND end_date > in_30_days
      ) THEN 'Ativo'
      -- A vencer: só recorrente terminando nos próximos 30 dias (precisa renovar)
      WHEN EXISTS (
        SELECT 1 FROM public.contracts
        WHERE client_id = client_record.id AND status != 'inactive' AND category = 'recorrente'
          AND end_date >= today_date AND end_date <= in_30_days
      ) THEN 'A vencer'
      -- Ativo: pontual / rescisão ainda valendo (não passa por "a vencer")
      WHEN EXISTS (
        SELECT 1 FROM public.contracts
        WHERE client_id = client_record.id AND status != 'inactive' AND category <> 'recorrente'
          AND end_date >= today_date
      ) THEN 'Ativo'
      WHEN EXISTS (
        SELECT 1 FROM public.contracts WHERE client_id = client_record.id AND end_date < today_date
      ) THEN 'Vencido'
      ELSE 'Inativo'
    END INTO best_status;

    UPDATE public.clients
    SET tags = ARRAY[best_status::TEXT], updated_at = NOW()
    WHERE id = client_record.id
      AND (tags IS NULL OR NOT (tags @> ARRAY[best_status::TEXT] AND array_length(tags, 1) = 1));

    UPDATE public.contracts
    SET status = CASE
      WHEN end_date < today_date THEN 'inactive'
      WHEN category = 'recorrente' AND end_date <= in_30_days THEN 'expiring'
      ELSE 'active'
    END, updated_at = NOW()
    WHERE client_id = client_record.id AND status != 'inactive' AND end_date IS NOT NULL;
  END LOOP;
END;
$function$;

-- A tag do cliente empurra o status dos contratos; "A vencer" só vira
-- 'expiring' no contrato recorrente — o pontual continua 'active'.
CREATE OR REPLACE FUNCTION public.sync_client_contract_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.contracts
  SET status = CASE
    WHEN 'Ativo'    = ANY(NEW.tags) THEN 'active'
    WHEN 'A vencer' = ANY(NEW.tags) THEN CASE WHEN category = 'recorrente' THEN 'expiring' ELSE 'active' END
    WHEN 'Vencido'  = ANY(NEW.tags) OR 'Inativo' = ANY(NEW.tags) THEN 'inactive'
    ELSE 'active'
  END,
  updated_at = NOW()
  WHERE client_id = NEW.id
    AND status NOT IN ('inactive', 'cancelled');
  RETURN NEW;
END;
$function$;
