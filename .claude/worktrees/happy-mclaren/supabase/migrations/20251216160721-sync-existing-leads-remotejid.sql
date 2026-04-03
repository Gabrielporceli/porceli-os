-- Sincronizar remotejid de leads existentes com conversations.remote_jid
-- Este script preenche o remotejid de leads que já existem no banco
-- mas não têm esse campo preenchido, usando o remote_jid das conversations correspondentes

UPDATE public.leads l
SET remotejid = (
  SELECT c.remote_jid 
  FROM public.conversations c
  WHERE c.user_id = l.user_id 
    AND (
      -- Match por número limpo do phone
      c.phone = l.phone
      -- Ou match por número limpo do remote_jid
      OR REGEXP_REPLACE(COALESCE(c.remote_jid, ''), '[^0-9+]', '', 'g') = l.phone
      -- Ou match por número limpo do numero
      OR REGEXP_REPLACE(COALESCE(c.numero, ''), '[^0-9+]', '', 'g') = l.phone
    )
    AND c.remote_jid IS NOT NULL
  ORDER BY c.updated_at DESC
  LIMIT 1
),
updated_at = NOW()
WHERE l.remotejid IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.conversations c
    WHERE c.user_id = l.user_id 
      AND (
        c.phone = l.phone
        OR REGEXP_REPLACE(COALESCE(c.remote_jid, ''), '[^0-9+]', '', 'g') = l.phone
        OR REGEXP_REPLACE(COALESCE(c.numero, ''), '[^0-9+]', '', 'g') = l.phone
      )
      AND c.remote_jid IS NOT NULL
  );

-- Log do resultado
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Sincronizados % leads com remotejid das conversations', updated_count;
END $$;

