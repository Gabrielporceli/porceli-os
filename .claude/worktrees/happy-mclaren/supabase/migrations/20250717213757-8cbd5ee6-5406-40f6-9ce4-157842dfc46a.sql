-- Adicionar índice único para prevenir duplicação de conversas
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_user_phone 
ON public.conversations(user_id, phone);

-- Limpar eventuais duplicatas existentes (manter apenas a mais recente)
DELETE FROM public.conversations c1
WHERE EXISTS (
  SELECT 1 FROM public.conversations c2
  WHERE c2.user_id = c1.user_id
    AND c2.phone = c1.phone
    AND c2.created_at > c1.created_at
);