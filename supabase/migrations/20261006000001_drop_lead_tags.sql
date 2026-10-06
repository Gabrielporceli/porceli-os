-- Remove a tabela de tags de leads (funcionalidade descontinuada)
-- A coluna tags[] na tabela leads é mantida para não quebrar dados existentes,
-- mas a tabela auxiliar `tags` que alimentava o gerenciador é dropada.

DROP TABLE IF EXISTS public.tags CASCADE;
