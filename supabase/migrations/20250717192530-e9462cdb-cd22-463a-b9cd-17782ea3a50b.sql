-- Atualizar a função process_webhook_message para criar lead automaticamente quando criar contato
CREATE OR REPLACE FUNCTION public.process_webhook_message(
  p_user_id UUID,
  p_numero TEXT,
  p_mensagem TEXT,
  p_direcao BOOLEAN,
  p_data_hora TIMESTAMP WITH TIME ZONE,
  p_nome_contato TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contato_uuid UUID;
  conversation_uuid UUID;
  message_uuid UUID;
  lead_uuid UUID;
  phone_clean TEXT;
  contact_name TEXT;
BEGIN
  -- Limpar o número de telefone
  phone_clean := REGEXP_REPLACE(p_numero, '[^0-9+]', '', 'g');
  contact_name := COALESCE(p_nome_contato, 'Contato ' || phone_clean);
  
  -- PASSO 1: Buscar ou criar contato
  SELECT id INTO contato_uuid
  FROM public.contatos
  WHERE user_id = p_user_id AND numero = phone_clean
  LIMIT 1;
  
  IF contato_uuid IS NULL THEN
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
    
    -- Se não existir lead, criar automaticamente com etapa "Sem atendimento"
    IF lead_uuid IS NULL THEN
      INSERT INTO public.leads (
        user_id,
        name,
        phone,
        source,
        stage,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        contact_name,
        phone_clean,
        'WhatsApp',
        'Sem atendimento',
        p_data_hora,
        p_data_hora
      )
      RETURNING id INTO lead_uuid;
      
      RAISE NOTICE 'Novo lead criado automaticamente: %', lead_uuid;
    END IF;
  ELSE
    -- Atualizar nome do contato se fornecido
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

  -- PASSO 2: Buscar ou criar conversa
  SELECT id INTO conversation_uuid
  FROM public.conversations
  WHERE user_id = p_user_id 
    AND (phone = phone_clean OR remote_jid = p_numero OR numero = p_numero)
  LIMIT 1;

  IF conversation_uuid IS NULL THEN
    -- Criar nova conversa
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
      phone_clean,
      p_numero,
      p_numero,
      contact_name,
      p_mensagem,
      'Sem atendimento',
      'Lead',
      CASE WHEN p_direcao THEN 'outbound' ELSE 'inbound' END,
      CASE WHEN p_direcao THEN 0 ELSE 1 END,
      p_data_hora,
      p_data_hora
    )
    RETURNING id INTO conversation_uuid;
    
    RAISE NOTICE 'Nova conversa criada: %', conversation_uuid;
  ELSE
    -- Atualizar conversa existente
    UPDATE public.conversations
    SET 
      last_message = p_mensagem,
      contact_name = COALESCE(p_nome_contato, contact_name),
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
$$;