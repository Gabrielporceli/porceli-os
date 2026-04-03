
-- Verificar e corrigir a estrutura das tabelas para garantir compatibilidade
-- Primeiro, vamos garantir que todos os campos necessários existam na tabela messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversa_id TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS direcao BOOLEAN DEFAULT false;

-- Adicionar campos na tabela conversations se não existirem
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS numero TEXT;

-- Criar ou atualizar a função para processar mensagens recebidas do webhook
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

  -- Inserir mensagem
  INSERT INTO public.messages (
    conversation_id,
    text,
    sender,
    direction,
    direcao,
    date_time,
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

-- Criar função simplificada para compatibilidade com webhooks
CREATE OR REPLACE FUNCTION public.webhook_insert_message(
  webhook_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Por enquanto, usar um usuário padrão (você pode ajustar isso depois)
  -- Em produção, você deve passar o user_id correto baseado na autenticação
  SELECT auth.uid() INTO user_uuid;
  
  -- Se não houver usuário autenticado, retornar erro
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Chamar a função principal
  SELECT public.process_webhook_message(
    user_uuid,
    webhook_data->>'numero',
    webhook_data->>'mensagem',
    (webhook_data->>'direcao')::BOOLEAN,
    (webhook_data->>'data_hora')::TIMESTAMP WITH TIME ZONE,
    webhook_data->>'conversa_id',
    webhook_data->>'nome_contato'
  ) INTO result_uuid;
  
  RETURN result_uuid;
END;
$$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_numero ON public.conversations(numero);
CREATE INDEX IF NOT EXISTS idx_messages_conversa_id ON public.messages(conversa_id);
CREATE INDEX IF NOT EXISTS idx_messages_numero ON public.messages(numero);
