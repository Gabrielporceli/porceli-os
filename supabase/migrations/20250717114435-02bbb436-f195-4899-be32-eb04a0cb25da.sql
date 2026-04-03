
-- Primeiro, vamos atualizar a tabela conversations existente para adequar à sua estrutura
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS remote_jid TEXT;

-- Criar índice para busca rápida por número/remote_jid
CREATE INDEX IF NOT EXISTS idx_conversations_remote_jid ON public.conversations(remote_jid);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(phone);

-- Atualizar a tabela messages para incluir os campos necessários
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_id TEXT,
ADD COLUMN IF NOT EXISTS direction BOOLEAN DEFAULT false, -- false = recebida, true = enviada
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS date_time TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca rápida de mensagens por conversa
CREATE INDEX IF NOT EXISTS idx_messages_conversation_date ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON public.messages(message_id);

-- Função para criar ou atualizar uma conversa baseada no número de telefone
CREATE OR REPLACE FUNCTION public.upsert_conversation(
  p_user_id UUID,
  p_phone TEXT,
  p_remote_jid TEXT,
  p_contact_name TEXT DEFAULT NULL,
  p_last_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_uuid UUID;
BEGIN
  -- Buscar conversa existente pelo telefone ou remote_jid
  SELECT id INTO conversation_uuid
  FROM public.conversations
  WHERE user_id = p_user_id 
    AND (phone = p_phone OR remote_jid = p_remote_jid)
  LIMIT 1;

  -- Se não existir, criar nova conversa
  IF conversation_uuid IS NULL THEN
    INSERT INTO public.conversations (
      user_id,
      phone,
      remote_jid,
      contact_name,
      last_message,
      stage,
      tag,
      direction,
      unread_count
    ) VALUES (
      p_user_id,
      p_phone,
      p_remote_jid,
      p_contact_name,
      p_last_message,
      'Sem atendimento',
      'Lead',
      'inbound',
      1
    )
    RETURNING id INTO conversation_uuid;
  ELSE
    -- Atualizar conversa existente
    UPDATE public.conversations
    SET 
      last_message = COALESCE(p_last_message, last_message),
      contact_name = COALESCE(p_contact_name, contact_name),
      remote_jid = COALESCE(p_remote_jid, remote_jid),
      updated_at = NOW(),
      unread_count = unread_count + 1
    WHERE id = conversation_uuid;
  END IF;

  RETURN conversation_uuid;
END;
$$;

-- Função para inserir mensagem e atualizar conversa
CREATE OR REPLACE FUNCTION public.insert_message(
  p_user_id UUID,
  p_phone TEXT,
  p_remote_jid TEXT,
  p_message TEXT,
  p_direction BOOLEAN,
  p_date_time TIMESTAMP WITH TIME ZONE,
  p_message_id TEXT,
  p_contact_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_uuid UUID;
  message_uuid UUID;
BEGIN
  -- Criar ou atualizar conversa
  SELECT public.upsert_conversation(
    p_user_id,
    p_phone,
    p_remote_jid,
    p_contact_name,
    p_message
  ) INTO conversation_uuid;

  -- Inserir mensagem
  INSERT INTO public.messages (
    conversation_id,
    text,
    sender,
    direction,
    date_time,
    message_id,
    contact_name,
    created_at
  ) VALUES (
    conversation_uuid,
    p_message,
    CASE WHEN p_direction THEN 'user' ELSE 'client' END,
    p_direction,
    p_date_time,
    p_message_id,
    p_contact_name,
    p_date_time
  )
  RETURNING id INTO message_uuid;

  RETURN message_uuid;
END;
$$;
