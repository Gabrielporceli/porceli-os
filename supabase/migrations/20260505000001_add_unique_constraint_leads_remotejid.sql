-- Adicionar constraint UNIQUE em (user_id, remotejid) na tabela leads
-- Necessário para o upsert com onConflict funcionar corretamente
-- Usa índice parcial para excluir valores NULL (NULL não conflita no PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_remotejid_unique
  ON public.leads (user_id, remotejid)
  WHERE remotejid IS NOT NULL AND remotejid != '';
