-- ============================================================================
-- MIGRAÇÃO COMPLETA: Adicionar coluna remotejid e sincronizar com conversations
-- ============================================================================
-- Este arquivo contém todas as migrações necessárias para:
-- 1. Adicionar a coluna remotejid na tabela leads
-- 2. Atualizar a função process_webhook_message para incluir remotejid
-- 3. Sincronizar leads existentes com remote_jid das conversations
-- ============================================================================

-- ============================================================================
-- PARTE 1: Adicionar coluna remotejid na tabela leads
-- ============================================================================

-- Adicionar coluna remotejid na tabela leads
-- Esta coluna armazena o remote JID do WhatsApp para identificação única do contato
-- Será sincronizada automaticamente com remote_jid da tabela conversations
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS remotejid TEXT;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.leads.remotejid IS 'Remote JID do WhatsApp para identificação única do contato. Sincronizado automaticamente com conversations.remote_jid';

-- Criar índices para melhorar performance nas consultas de sincronização
CREATE INDEX IF NOT EXISTS idx_leads_remotejid ON public.leads(remotejid);
CREATE INDEX IF NOT EXISTS idx_leads_user_phone ON public.leads(user_id, phone);

-- ============================================================================
-- PARTE 2: Atualizar função process_webhook_message para incluir remotejid
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_webhook_message(
  p_user_id uuid, 
  p_numero text, 
  p_mensagem text, 
  p_direcao boolean, 
  p_data_hora timestamp with time zone, 
  p_nome_contato text DEFAULT NULL::text, 
  p_media_type text DEFAULT NULL::text, 
  p_media_url text DEFAULT NULL::text, 
  p_media_filename text DEFAULT NULL::text, 
  p_media_size bigint DEFAULT NULL::bigint, 
  p_media_key text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  contato_uuid UUID;
  conversation_uuid UUID;
  message_uuid UUID;
  lead_uuid UUID;
  phone_clean TEXT;
  contact_name TEXT;
  default_stage_id TEXT;
BEGIN
  -- Limpar o número de telefone
  phone_clean := REGEXP_REPLACE(p_numero, '[^0-9+]', '', 'g');
  contact_name := COALESCE(p_nome_contato, 'Contato ' || phone_clean);
  
  -- Usar o stage UUID específico para novos leads
  default_stage_id := '002c933d-6ba0-4cf9-8fc7-06ba19e998e1';
  
  -- PASSO 1: Buscar ou criar contato - APENAS se a mensagem NÃO foi enviada pelo usuário
  SELECT c.id INTO contato_uuid
  FROM public.contatos c
  WHERE c.user_id = p_user_id AND c.numero = phone_clean
  LIMIT 1;
  
  -- SÓ CRIAR CONTATO/LEAD SE A MENSAGEM FOI RECEBIDA (não enviada pelo usuário)
  IF contato_uuid IS NULL AND NOT p_direcao THEN
    -- Criar novo contato
    INSERT INTO public.contatos (
      user_id,
      numero,
      nome,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      phone_clean,
      contact_name,
      p_data_hora,
      p_data_hora
    )
    RETURNING id INTO contato_uuid;
    
    RAISE NOTICE 'Novo contato criado: %', contato_uuid;
    
    -- Verificar se já existe um lead com este número
    SELECT l.id INTO lead_uuid
    FROM public.leads l
    WHERE l.user_id = p_user_id AND l.phone = phone_clean
    LIMIT 1;
    
    -- Se não existir lead, criar automaticamente com o stage UUID específico
    -- INCLUINDO remotejid usando p_numero (remote_jid original)
    IF lead_uuid IS NULL THEN
      INSERT INTO public.leads (
        user_id,
        name,
        phone,
        remotejid,
        source,
        stage,
        value,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        contact_name,
        phone_clean,
        p_numero,
        'WhatsApp',
        default_stage_id,
        NULL,
        p_data_hora,
        p_data_hora
      )
      RETURNING id INTO lead_uuid;
      
      RAISE NOTICE 'Novo lead criado automaticamente: %', lead_uuid;
    END IF;
  ELSIF contato_uuid IS NOT NULL AND NOT p_direcao THEN
    -- Atualizar nome do contato APENAS se mensagem foi recebida (não enviada pelo usuário)
    IF p_nome_contato IS NOT NULL THEN
      UPDATE public.contatos
      SET nome = p_nome_contato, updated_at = p_data_hora
      WHERE id = contato_uuid;
      
      -- Atualizar também o nome do lead vinculado
      UPDATE public.leads
      SET name = p_nome_contato, updated_at = p_data_hora
      WHERE user_id = p_user_id AND phone = phone_clean;
    END IF;
  END IF;

  -- PASSO 2: Buscar conversa APENAS pelo número limpo para evitar duplicação
  SELECT conv.id INTO conversation_uuid
  FROM public.conversations conv
  WHERE conv.user_id = p_user_id 
    AND (conv.phone = phone_clean 
         OR REGEXP_REPLACE(COALESCE(conv.remote_jid, ''), '[^0-9+]', '', 'g') = phone_clean 
         OR REGEXP_REPLACE(COALESCE(conv.numero, ''), '[^0-9+]', '', 'g') = phone_clean)
  LIMIT 1;

  IF conversation_uuid IS NULL THEN
    -- Criar nova conversa com todos os campos normalizados
    INSERT INTO public.conversations (
      user_id,
      phone,
      remote_jid,
      numero,
      contact_name,
      last_message,
      stage,
      tag,
      direction,
      unread_count,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      phone_clean,        -- Sempre número limpo
      p_numero,           -- Número original para referência
      phone_clean,        -- Também número limpo para consistência
      contact_name,
      COALESCE(p_mensagem, 'Mídia enviada'),
      default_stage_id,
      'Lead',
      CASE WHEN p_direcao THEN 'outbound' ELSE 'inbound' END,
      CASE WHEN p_direcao THEN 0 ELSE 1 END,
      p_data_hora,
      p_data_hora
    )
    RETURNING id INTO conversation_uuid;
    
    RAISE NOTICE 'Nova conversa criada: %', conversation_uuid;
  ELSE
    -- Atualizar conversa existente - contact_name só atualizado se mensagem foi recebida
    UPDATE public.conversations
    SET 
      last_message = COALESCE(p_mensagem, 'Mídia enviada'),
      contact_name = CASE
        WHEN NOT p_direcao AND p_nome_contato IS NOT NULL THEN p_nome_contato
        ELSE conversations.contact_name
      END,
      updated_at = p_data_hora,
      unread_count = CASE WHEN p_direcao THEN conversations.unread_count ELSE conversations.unread_count + 1 END
    WHERE id = conversation_uuid;
  END IF;

  -- PASSO 3: Sincronizar remotejid do lead com remote_jid da conversation
  -- Isso garante que leads existentes e novos tenham o remotejid correto
  UPDATE public.leads
  SET remotejid = (
    SELECT c.remote_jid 
    FROM public.conversations c
    WHERE c.user_id = p_user_id 
      AND c.id = conversation_uuid
    LIMIT 1
  ),
  updated_at = p_data_hora
  WHERE user_id = p_user_id 
    AND phone = phone_clean
    AND (
      remotejid IS NULL 
      OR remotejid != (
        SELECT c.remote_jid 
        FROM public.conversations c
        WHERE c.user_id = p_user_id 
          AND c.id = conversation_uuid
        LIMIT 1
      )
    );

  -- PASSO 4: Inserir mensagem incluindo todos os campos de mídia
  INSERT INTO public.messages (
    conversation_id,
    text,
    numero,
    mensagem,
    direcao,
    data_hora,
    nome_contato,
    media_type,
    media_url,
    media_filename,
    media_size,
    created_at,
    updated_at
  ) VALUES (
    conversation_uuid,
    COALESCE(p_mensagem, 'Mídia enviada'),
    p_numero,
    p_mensagem,
    p_direcao,
    p_data_hora,
    p_nome_contato,
    p_media_type,
    p_media_url,
    p_media_filename,
    p_media_size,
    p_data_hora,
    p_data_hora
  )
  RETURNING id INTO message_uuid;

  RAISE NOTICE 'Mensagem inserida: %, Contato: %, Conversa: %, Lead: %', message_uuid, contato_uuid, conversation_uuid, lead_uuid;
  
  RETURN message_uuid;
END;
$function$;

-- ============================================================================
-- PARTE 3: Sincronizar remotejid de leads existentes com conversations
-- ============================================================================

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
  RAISE NOTICE 'Migração completa! Sincronizados % leads com remotejid das conversations', updated_count;
END $$;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

