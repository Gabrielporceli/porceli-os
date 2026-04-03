
-- Criar tabela para armazenar os planos
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'bg-purple-600 text-white hover:bg-purple-700',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para que usuários só vejam seus próprios planos
CREATE POLICY "Users can view their own plans" 
  ON public.plans 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plans" 
  ON public.plans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans" 
  ON public.plans 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans" 
  ON public.plans 
  FOR DELETE 
  USING (auth.uid() = user_id AND is_default = false);

-- Inserir planos padrão para todos os usuários (será feito via trigger quando criar conta)
-- Por enquanto, vamos criar uma função para popular os planos padrão
CREATE OR REPLACE FUNCTION public.create_default_plans_for_user(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.plans (user_id, name, is_default) VALUES
    (user_uuid, 'Vendas', true),
    (user_uuid, 'Branding', true),
    (user_uuid, 'Landing Page', true),
    (user_uuid, 'Automação', true)
  ON CONFLICT (name) DO NOTHING;
END;
$$;

-- Criar trigger para adicionar planos padrão quando um usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar planos padrão para o novo usuário
  PERFORM create_default_plans_for_user(NEW.id);
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela auth.users (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
