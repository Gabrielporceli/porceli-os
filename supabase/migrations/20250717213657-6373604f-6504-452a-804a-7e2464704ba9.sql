-- Corrigir a função process_webhook_message para evitar duplicação de conversas

CREATE OR REPLACE FUNCTION public.process_webhook_message(p_user_id uuid, p_numero text, p_mensagem text, p_direcao boolean, p_data_hora timestamp with time zone, p_nome_contato text DEFAULT NULL::text)
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
  SELECT id INTO contato_uuid
  FROM public.contatos
  WHERE user_id = p_user_id AND numero = phone_clean
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
    SELECT id INTO lead_uuid
    FROM public.leads
    WHERE user_id = p_user_id AND phone = phone_clean
    LIMIT 1;
    
    -- Se não existir lead, criar automaticamente com o stage UUID específico
    IF lead_uuid IS NULL THEN
      INSERT INTO public.leads (
        user_id,
        name,
        phone,
        source,
        stage,
        value,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        contact_name,
        phone_clean,
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
  SELECT id INTO conversation_uuid
  FROM public.conversations
  WHERE user_id = p_user_id 
    AND (phone = phone_clean 
         OR REGEXP_REPLACE(COALESCE(remote_jid, ''), '[^0-9+]', '', 'g') = phone_clean 
         OR REGEXP_REPLACE(COALESCE(numero, ''), '[^0-9+]', '', 'g') = phone_clean)
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
      p_mensagem,
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
      last_message = p_mensagem,
      contact_name = CASE
        WHEN NOT p_direcao AND p_nome_contato IS NOT NULL THEN p_nome_contato
        ELSE contact_name
      END,
      updated_at = p_data_hora,
      unread_count = CASE WHEN p_direcao THEN unread_count ELSE unread_count + 1 END
    WHERE id = conversation_uuid;
  END IF;

  -- PASSO 3: Inserir mensagem usando APENAS os campos da nova estrutura
  INSERT INTO public.messages (
    conversation_id,
    text,
    numero,
    mensagem,
    direcao,
    data_hora,
    nome_contato,
    created_at,
    updated_at
  ) VALUES (
    conversation_uuid,
    p_mensagem,
    p_numero,
    p_mensagem,
    p_direcao,
    p_data_hora,
    p_nome_contato,
    p_data_hora,
    p_data_hora
  )
  RETURNING id INTO message_uuid;

  RAISE NOTICE 'Mensagem inserida: %, Contato: %, Conversa: %, Lead: %', message_uuid, contato_uuid, conversation_uuid, lead_uuid;
  
  RETURN message_uuid;
END;
$function$;