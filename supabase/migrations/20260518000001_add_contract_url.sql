-- Adiciona coluna contract_url na tabela contracts
-- A coluna existia no código (modal + lista com link externo) mas nunca foi criada no banco,
-- causando erro 400 ao renovar ou criar contratos com URL preenchida.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_url text;
