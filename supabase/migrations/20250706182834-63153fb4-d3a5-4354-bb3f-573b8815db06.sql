
-- Criar tabela para lançamentos financeiros
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  due_date DATE NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lançamentos financeiros
CREATE POLICY "Users can view their own financial entries" 
  ON public.financial_entries 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial entries" 
  ON public.financial_entries 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial entries" 
  ON public.financial_entries 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial entries" 
  ON public.financial_entries 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_financial_entries_client_id ON public.financial_entries(client_id);
CREATE INDEX idx_financial_entries_user_id ON public.financial_entries(user_id);
CREATE INDEX idx_financial_entries_due_date ON public.financial_entries(due_date);
CREATE INDEX idx_financial_entries_status ON public.financial_entries(status);
