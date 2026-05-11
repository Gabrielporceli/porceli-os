import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Automation {
  id: string;
  jobname: string;
  display_name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  schedule: string;
  schedule_human: string;
  function_name: string;
  last_triggered_at: string | null;
  is_scheduled: boolean;
  updated_at: string;
  config: Record<string, string> | null;
  trigger_type: 'cron' | 'webhook';
}

async function callManageAutomations(body: object) {
  const { data, error } = await supabase.functions.invoke('manage-automations', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAutomations() {
  return useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => {
      // Fallback: lê direto da tabela se edge function não responder
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('category')
        .order('display_name');
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        ...a,
        schedule_human: cronToHumanBRT(a.schedule),
        is_scheduled: a.enabled,
      }));
    },
    staleTime: 30_000,
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return callManageAutomations({ action: 'toggle', id, enabled });
    },
    onSuccess: (_, { enabled }) => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success(enabled ? 'Automação ativada' : 'Automação desativada');
    },
    onError: (err: any) => {
      toast.error('Erro ao alterar automação: ' + err.message);
    },
  });
}

export function useUpdateAutomationSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, schedule }: { id: string; schedule: string }) => {
      return callManageAutomations({ action: 'update_schedule', id, schedule });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Horário atualizado com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar horário: ' + err.message);
    },
  });
}

export function useUpdateAutomationInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase
        .from('automations')
        .update({ description, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar descrição: ' + err.message);
    },
  });
}

export function useUpdateAutomationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, string> }) => {
      const { error } = await supabase
        .from('automations')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Textos da mensagem atualizados!');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar textos: ' + err.message);
    },
  });
}

export function useTriggerAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return callManageAutomations({ action: 'trigger', id });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      if (data?.success) {
        toast.success('Automação executada com sucesso!');
      } else {
        toast.error('A automação retornou um erro. Verifique os logs.');
      }
    },
    onError: (err: any) => {
      toast.error('Erro ao executar automação: ' + err.message);
    },
  });
}

// Helper: converte cron UTC → texto legível em BRT
export function cronToHumanBRT(cron: string): string {
  if (!cron) return '—';
  if (cron === '* * * * *') return 'A cada minuto';
  if (cron === 'webhook') return 'Ao cadastrar cliente';
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const minute = parseInt(parts[0]);
  const hourUTC = parseInt(parts[1]);
  if (isNaN(minute) || isNaN(hourUTC)) return cron;
  const hourBRT = ((hourUTC - 3) + 24) % 24;
  return `Todo dia às ${String(hourBRT).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Helper: BRT time string → cron expression UTC
export function brtTimeToCron(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hourUTC = (h + 3) % 24;
  return `${m} ${hourUTC} * * *`;
}

// Helper: cron → BRT time string (para o input type="time")
export function cronToBRTTime(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 2) return '00:00';
  const minute = parseInt(parts[0]);
  const hourUTC = parseInt(parts[1]);
  if (isNaN(minute) || isNaN(hourUTC)) return '00:00';
  const hourBRT = ((hourUTC - 3) + 24) % 24;
  return `${String(hourBRT).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
