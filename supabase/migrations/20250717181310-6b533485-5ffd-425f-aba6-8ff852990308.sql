-- Primeiro, vamos criar uma tabela de contatos se não existir
CREATE TABLE IF NOT EXISTS public.contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero TEXT NOT NULL,
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, numero)
);

-- Habilitar RLS na tabela contatos
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Políticas para contatos (usuários podem ver/editar seus próprios contatos)
CREATE POLICY "Users can view their own contacts" ON public.contatos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" ON public.contatos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON public.contatos
  FOR UPDATE USING (auth.uid() = user_id);

-- Política especial para permitir que o backend/webhook crie contatos sem autenticação
CREATE POLICY "Backend can create contacts" ON public.contatos
  FOR INSERT WITH CHECK (true);

-- Remover políticas existentes da tabela messages
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;

-- Nova política que permite inserção sem autenticação (para webhooks)
CREATE POLICY "Backend can create messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Política de visualização baseada em auth para o frontend
CREATE POLICY "Users can view their conversation messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Política para permitir criação de conversas sem autenticação
CREATE POLICY "Backend can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

-- Atualizar a função process_webhook_message para criar contatos e conversas automaticamente
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
  contato_uuid UUID;
  conversation_uuid UUID;
  message_uuid UUID;
  phone_clean TEXT;
BEGIN
  -- Limpar o número de telefone
  phone_clean := REGEXP_REPLACE(p_numero, '[^0-9+]', '', 'g');
  
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
      COALESCE(p_nome_contato, 'Contato ' || phone_clean),
      p_data_hora,
      p_data_hora
    )
    RETURNING id INTO contato_uuid;
    
    RAISE NOTICE 'Novo contato criado: %', contato_uuid;
  ELSE
    -- Atualizar nome do contato se fornecido
    IF p_nome_contato IS NOT NULL THEN
      UPDATE public.contatos
      SET nome = p_nome_contato, updated_at = p_data_hora
      WHERE id = contato_uuid;
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
      COALESCE(p_nome_contato, 'Contato ' || phone_clean),
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

  -- PASSO 3: Inserir mensagem vinculada ao contato e conversa
  INSERT INTO public.messages (
    conversation_id,
    text,
    sender,
    direction,
    date_time,
    message_id,
    created_at,
    numero,
    mensagem,
    direcao,
    data_hora,
    conversa_id,
    nome_contato
  ) VALUES (
    conversation_uuid,
    p_mensagem,
    CASE WHEN p_direcao THEN 'user' ELSE 'client' END,
    p_direcao,
    p_data_hora,
    p_conversa_id,
    p_data_hora,
    p_numero,
    p_mensagem,
    p_direcao,
    p_data_hora,
    p_conversa_id,
    p_nome_contato
  )
  RETURNING id INTO message_uuid;

  RAISE NOTICE 'Mensagem inserida: %, Contato: %, Conversa: %', message_uuid, contato_uuid, conversation_uuid;
  
  RETURN message_uuid;
END;
$$;