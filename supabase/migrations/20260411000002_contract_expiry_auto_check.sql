-- ============================================================================
-- FIX: Atualização automática de tags de clientes baseada em vencimento de contratos
-- Garante que as tags (Ativo, A vencer, Vencido, Inativo) estejam sempre corretas
-- mesmo sem o usuário abrir o app.
-- ============================================================================

-- Atualizar a função update_client_tags_from_contracts para ser mais robusta
-- e considerar múltiplos contratos por cliente
CREATE OR REPLACE FUNCTION public.update_client_tags_from_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  client_record RECORD;
  best_status TEXT;
  today_date DATE := CURRENT_DATE;
  in_30_days DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  -- Para cada cliente que tem contratos
  FOR client_record IN
    SELECT DISTINCT c.id, c.user_id
    FROM public.clients c
    INNER JOIN public.contracts ct ON ct.client_id = c.id
  LOOP
    -- Determinar o melhor status baseado em todos os contratos do cliente
    -- Prioridade: ativo > a vencer > vencido
    SELECT
      CASE
        -- Se tem algum contrato ativo (não vencido e além de 30 dias)
        WHEN EXISTS (
          SELECT 1 FROM public.contracts ct2
          WHERE ct2.client_id = client_record.id
            AND ct2.end_date > in_30_days
            AND ct2.status != 'inactive'
        ) THEN 'Ativo'
        -- Se tem algum contrato a vencer nos próximos 30 dias
        WHEN EXISTS (
          SELECT 1 FROM public.contracts ct2
          WHERE ct2.client_id = client_record.id
            AND ct2.end_date >= today_date
            AND ct2.end_date <= in_30_days
            AND ct2.status != 'inactive'
        ) THEN 'A vencer'
        -- Se todos os contratos estão vencidos
        WHEN EXISTS (
          SELECT 1 FROM public.contracts ct2
          WHERE ct2.client_id = client_record.id
            AND ct2.end_date < today_date
        ) THEN 'Vencido'
        ELSE 'Inativo'
      END
    INTO best_status;

    -- Atualizar as tags do cliente (preservando outras tags que não sejam de status)
    UPDATE public.clients
    SET
      tags = ARRAY[best_status::text],
      updated_at = NOW()
    WHERE id = client_record.id
      AND (
        tags IS NULL
        OR NOT (tags @> ARRAY[best_status::text] AND array_length(tags, 1) = 1)
      );

    -- Atualizar status dos contratos do cliente
    UPDATE public.contracts
    SET
      status = CASE
        WHEN end_date < today_date THEN 'inactive'
        WHEN end_date <= in_30_days THEN 'expiring'
        ELSE 'active'
      END,
      updated_at = NOW()
    WHERE client_id = client_record.id
      AND status != 'inactive'  -- Não reativar contratos manualmente desativados
      AND end_date IS NOT NULL;

  END LOOP;
END;
$function$;

-- Agendar execução diária da verificação de contratos (às 09:00 BRT = 12:00 UTC)
-- Remove o job anterior se existir
SELECT cron.unschedule('verificar-contratos-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-contratos-diario');

SELECT cron.schedule(
  'verificar-contratos-diario',
  '0 12 * * *',
  $$
  SELECT public.update_client_tags_from_contracts();
  $$
);
