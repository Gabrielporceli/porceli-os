-- Contratos: categoria da receita + data de cancelamento.
--
-- POR QUÊ. A tabela misturava três coisas diferentes como se fossem serviço
-- recorrente: mensalidade de verdade, trabalho pontual (landing page,
-- configuração de cardápio) e parcela de rescisão (Distrato). Isso inflava o
-- MRR (Distrato do Growth Hub contava R$ 1.250/mês) e fazia cliente em
-- rescisão contar como ativo. E cancelamento antes do fim não deixava rastro
-- de QUANDO aconteceu — só o status virava inativo — então o churn não tinha
-- como ser calculado por mês.
--
-- O status continua com a mesma regra de antes: a geração de faturas
-- (useGenerateFinancialEntries) depende de status active/expiring, e um
-- Distrato em andamento PRECISA continuar gerando as parcelas. A categoria só
-- muda como o Dashboard lê os contratos.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS cancelled_at date;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_category_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_category_check
  CHECK (category IN ('recorrente', 'pontual', 'rescisao'));

COMMENT ON COLUMN public.contracts.category IS
  'recorrente = mensalidade (entra no MRR/churn); pontual = trabalho avulso; rescisao = parcelas de distrato/multa.';
COMMENT ON COLUMN public.contracts.cancelled_at IS
  'Dia em que o contrato foi encerrado ANTES do end_date. Nulo = correu até o fim (ou ainda corre).';

-- ── Cancelamentos antigos — ANTES de classificar: o trg_contracts_updated_at
--    reescreve updated_at em todo UPDATE, e a classificação apagaria a data
--    usada aqui ──
-- Inativo com updated_at antes do fim. O updated_at é
-- a melhor aproximação que existe (contratos inativos não são mais tocados
-- pela rotina diária, então ele guarda o momento em que viraram inativos).
UPDATE public.contracts
SET cancelled_at = updated_at::date
WHERE status = 'inactive'
  AND cancelled_at IS NULL
  AND end_date IS NOT NULL
  AND updated_at::date < end_date::date;

-- ── Classificação dos contratos que já existem ─────────────────────────────
UPDATE public.contracts SET category = 'pontual'
WHERE single_payment OR type IN ('Landing Page', 'Configuração Cardapio');

UPDATE public.contracts SET category = 'rescisao'
WHERE type IN ('Distrato', 'Rescisão de contrato');

-- ── Daqui pra frente, automático ───────────────────────────────────────────
-- Um gatilho só cobre TODOS os caminhos de cancelamento: botão de cancelar,
-- edição manual do status e o sync_client_contract_status (cliente marcado
-- Inativo). A rotina diária que vence contratos não conta como cancelamento:
-- ela só inativa quando end_date já passou.
CREATE OR REPLACE FUNCTION public.contracts_categoria_e_cancelamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Pagamento único não é mensalidade. Só corrige quem ficou como
  -- recorrente: uma rescisão paga de uma vez continua rescisão.
  IF NEW.single_payment AND NEW.category = 'recorrente' THEN
    NEW.category := 'pontual';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'inactive' AND OLD.status IS DISTINCT FROM 'inactive'
       AND NEW.cancelled_at IS NULL
       AND NEW.end_date IS NOT NULL AND NEW.end_date::date > CURRENT_DATE THEN
      NEW.cancelled_at := CURRENT_DATE;
    ELSIF NEW.status IN ('active', 'expiring') AND OLD.status = 'inactive' THEN
      -- Reativado: o cancelamento não valeu.
      NEW.cancelled_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_categoria_e_cancelamento ON public.contracts;
CREATE TRIGGER trg_contracts_categoria_e_cancelamento
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.contracts_categoria_e_cancelamento();
