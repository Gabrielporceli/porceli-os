-- Tabela de metadados das automações
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobname TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Zap',
  category TEXT DEFAULT 'sistema',
  enabled BOOLEAN DEFAULT true,
  schedule TEXT NOT NULL,
  function_name TEXT NOT NULL,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read automations"
  ON public.automations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update automations"
  ON public.automations FOR UPDATE TO authenticated USING (true);

-- Inserir as automações existentes
INSERT INTO public.automations (jobname, display_name, description, icon, category, enabled, schedule, function_name) VALUES
  ('resumo-diario-whatsapp',   'Resumo Diário de Atividades',  'Envia para o grupo do WhatsApp um resumo com os eventos do Google Calendar e tarefas do Notion do dia.', 'CalendarDays', 'atividades', true, '0 9 * * *',   'daily-summary'),
  ('vigilante-tarefas-10min',  'Lembrete de Tarefas',          'Verifica a cada minuto se alguma tarefa ou evento começa em 10 minutos e envia alerta no WhatsApp.',        'Bell',         'atividades', true, '* * * * *',   'task-reminder'),
  ('alerta-financeiro-diario', 'Alerta Financeiro Diário',     'Envia relatório diário com clientes com pagamentos em atraso e contratos que vencem nos próximos 30 dias.',  'DollarSign',   'financeiro', true, '0 11 * * *',  'financial-alert'),
  ('cleanup-messages-media',   'Limpeza de Mídias Antigas',    'Remove arquivos de imagens, vídeos e documentos enviados há mais de 30 dias para economizar espaço.',        'Trash2',       'sistema',    true, '0 2 * * *',   'cleanup-media')
ON CONFLICT (jobname) DO NOTHING;

-- Função privilegiada para gerenciar cron jobs (SECURITY DEFINER para acessar schema cron)
CREATE OR REPLACE FUNCTION public.manage_automation_cron(
  p_action TEXT,
  p_jobname TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_command TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF p_action = 'unschedule' THEN
    BEGIN
      PERFORM cron.unschedule(p_jobname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

  ELSIF p_action = 'schedule' AND p_schedule IS NOT NULL AND p_command IS NOT NULL THEN
    BEGIN
      PERFORM cron.unschedule(p_jobname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(p_jobname, p_schedule, p_command);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_automation_cron TO authenticated;
