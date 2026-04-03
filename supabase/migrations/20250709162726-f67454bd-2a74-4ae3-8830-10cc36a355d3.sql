
-- Criar tabela para armazenar etapas do kanban
CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-gray-500',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Adicionar RLS para stages
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Políticas para stages
CREATE POLICY "Users can view their own stages" 
  ON public.stages 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stages" 
  ON public.stages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stages" 
  ON public.stages 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stages" 
  ON public.stages 
  FOR DELETE 
  USING (auth.uid() = user_id AND is_default = false);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_stages_updated_at
  BEFORE UPDATE ON public.stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir etapas padrão para usuários existentes
INSERT INTO public.stages (user_id, name, color, position, is_default)
SELECT 
  auth.uid(),
  stage_data.name,
  stage_data.color,
  stage_data.position,
  true
FROM (
  VALUES 
    ('Sem atendimento', 'bg-gray-500', 1),
    ('Em atendimento', 'bg-yellow-500', 2),
    ('Reunião agendada', 'bg-blue-500', 3),
    ('Proposta enviada', 'bg-purple-500', 4),
    ('Frio', 'bg-gray-400', 5)
) AS stage_data(name, color, position)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- Função para criar etapas padrão para novos usuários
CREATE OR REPLACE FUNCTION public.create_default_stages_for_user(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stages (user_id, name, color, position, is_default) VALUES
    (user_uuid, 'Sem atendimento', 'bg-gray-500', 1, true),
    (user_uuid, 'Em atendimento', 'bg-yellow-500', 2, true),
    (user_uuid, 'Reunião agendada', 'bg-blue-500', 3, true),
    (user_uuid, 'Proposta enviada', 'bg-purple-500', 4, true),
    (user_uuid, 'Frio', 'bg-gray-400', 5, true)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Atualizar a função handle_new_user para incluir stages
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Criar planos padrão para o novo usuário
  PERFORM create_default_plans_for_user(NEW.id);
  
  -- Criar etapas padrão para o novo usuário
  PERFORM create_default_stages_for_user(NEW.id);
  
  RETURN NEW;
END;
$$;
