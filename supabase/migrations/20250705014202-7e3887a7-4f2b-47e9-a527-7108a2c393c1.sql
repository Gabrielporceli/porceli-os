
-- Criar função para sincronizar status entre cliente e contratos
CREATE OR REPLACE FUNCTION public.sync_client_contract_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mapear tags do cliente para status do contrato
  UPDATE public.contracts 
  SET status = CASE 
    WHEN 'Ativo' = ANY(NEW.tags) THEN 'active'
    WHEN 'A vencer' = ANY(NEW.tags) THEN 'expiring'
    WHEN 'Vencido' = ANY(NEW.tags) OR 'Inativo' = ANY(NEW.tags) THEN 'inactive'
    ELSE 'active' -- default
  END,
  updated_at = NOW()
  WHERE client_id = NEW.id
  AND (
    status NOT IN ('inactive', 'concluded') -- Não reativa o que foi encerrado ou concluído
    OR 'Inativo' = ANY(NEW.tags)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronizar status quando cliente é atualizado
DROP TRIGGER IF EXISTS trigger_sync_client_contract_status ON public.clients;
CREATE TRIGGER trigger_sync_client_contract_status
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  WHEN (OLD.tags IS DISTINCT FROM NEW.tags)
  EXECUTE FUNCTION public.sync_client_contract_status();

-- Atualizar função existente create_contract_for_client para usar o status correto baseado nas tags
CREATE OR REPLACE FUNCTION public.create_contract_for_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create contract if client has contract_end date and monthly_value
  IF NEW.contract_end IS NOT NULL AND NEW.monthly_value > 0 THEN
    INSERT INTO public.contracts (
      user_id,
      client_id,
      type,
      monthly_value,
      start_date,
      end_date,
      status
    ) VALUES (
      NEW.user_id,
      NEW.id,
      COALESCE(NEW.plan, 'Serviço Geral'),
      NEW.monthly_value,
      COALESCE(NEW.start_date, CURRENT_DATE),
      NEW.contract_end,
      -- Mapear tags do cliente para status do contrato
      CASE 
        WHEN 'Ativo' = ANY(NEW.tags) THEN 'active'
        WHEN 'A vencer' = ANY(NEW.tags) THEN 'expiring'
        WHEN 'Vencido' = ANY(NEW.tags) OR 'Inativo' = ANY(NEW.tags) THEN 'inactive'
        ELSE 'active' -- default
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger para criação de contratos
DROP TRIGGER IF EXISTS trigger_create_contract_for_client ON public.clients;
CREATE TRIGGER trigger_create_contract_for_client
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contract_for_client();
