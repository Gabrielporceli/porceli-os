
-- Corrigir definitivamente a função process_webhook_message para usar apenas campos existentes
CREATE OR REPLACE FUNCTION public.process_webhook_message(
  p_user_id UUID,
  p_numero TEXT,
  p_mensagem TEXT,
  p_direcao BOOLEAN,
  p_data_hora TIMESTAMP WITH TIME ZONE,
  p_conversa_id TEXT,
  p_nome_contato TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_uuid UUID;
  message_uuid UUID;
  phone_clean TEXT;
BEGIN
  -- Limpar o número de telefone (remover caracteres especiais se necessário)
  phone_clean := REGEXP_REPLACE(p_numero, '[^0-9+]', '', 'g');
  
  -- Buscar conversa existente pelo número ou remote_jid
  SELECT id INTO conversation_uuid
  FROM public.conversations
  WHERE user_id = p_user_id 
    AND (phone = phone_clean OR remote_jid = p_numero OR numero = p_numero)
  LIMIT 1;

  -- Se não existir, criar nova conversa
  IF conversation_uuid IS NULL THEN
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
      p_nome_contato,
      p_mensagem,
      'Sem atendimento',
      'Lead',
      CASE WHEN p_direcao THEN 'outbound' ELSE 'inbound' END,
      CASE WHEN p_direcao THEN 0 ELSE 1 END,
      p_data_hora,
      p_data_hora
    )
    RETURNING id INTO conversation_uuid;
  ELSE
    -- Atualizar conversa existente
    UPDATE public.conversations
    SET 
      last_message = p_mensagem,
      contact_name = COALESCE(p_nome_contato, contact_name),
      remote_jid = COALESCE(p_numero, remote_jid),
      numero = COALESCE(p_numero, numero),
      updated_at = p_data_hora,
      unread_count = CASE WHEN p_direcao THEN unread_count ELSE unread_count + 1 END
    WHERE id = conversation_uuid;
  END IF;

  -- Inserir mensagem usando APENAS os campos que existem na tabela messages
  INSERT INTO public.messages (
    conversation_id,
    text,
    sender,
    direction,
    direcao,
    date_time,
    data_hora,
    message_id,
    conversa_id,
    numero,
    contact_name,
    created_at
  ) VALUES (
    conversation_uuid,
    p_mensagem,
    CASE WHEN p_direcao THEN 'user' ELSE 'client' END,
    p_direcao,
    p_direcao,
    p_data_hora,
    p_data_hora,
    p_conversa_id,
    p_conversa_id,
    p_numero,
    p_nome_contato,
    p_data_hora
  )
  RETURNING id INTO message_uuid;

  RETURN message_uuid;
END;
$$;

-- Testar a função com dados de exemplo para garantir que funciona
DO $$
DECLARE
  test_user_id UUID := 'bad3abae-951e-49a4-8738-9037661fd5a1';
  test_message_id UUID;
BEGIN
  -- Testar a função
  SELECT public.process_webhook_message(
    test_user_id,
    '5511999999999',
    'Mensagem de teste',
    false,
    NOW(),
    'test_conversation',
    'Contato Teste'
  ) INTO test_message_id;
  
  RAISE NOTICE 'Função testada com sucesso. ID da mensagem: %', test_message_id;
END;
$$;
