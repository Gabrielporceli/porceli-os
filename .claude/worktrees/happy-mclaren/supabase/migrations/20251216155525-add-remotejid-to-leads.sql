-- Adicionar coluna remotejid na tabela leads
-- Esta coluna armazena o remote JID do WhatsApp para identificação única do contato
-- Será sincronizada automaticamente com remote_jid da tabela conversations
ALTER TABLE public.leads 
ADD COLUMN remotejid TEXT;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.leads.remotejid IS 'Remote JID do WhatsApp para identificação única do contato. Sincronizado automaticamente com conversations.remote_jid';

-- Criar índice para melhorar performance nas consultas de sincronização
CREATE INDEX IF NOT EXISTS idx_leads_remotejid ON public.leads(remotejid);
CREATE INDEX IF NOT EXISTS idx_leads_user_phone ON public.leads(user_id, phone);

