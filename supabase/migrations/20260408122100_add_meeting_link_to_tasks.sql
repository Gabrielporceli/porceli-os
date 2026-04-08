
-- Adicionar coluna para link de reunião nas tarefas recorrentes
ALTER TABLE public.recurring_tasks 
ADD COLUMN IF NOT EXISTS meeting_link text;
