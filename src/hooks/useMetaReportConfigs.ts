import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MetaReportConfig {
  id: string;
  client_name: string;
  client_id: string | null;
  meta_account_id: string;
  meta_pixel_id: string | null;
  meta_access_token: string;
  whatsapp_recipient: string;
  timezone_offset: number;
  report_template: string | null;
  campaign_type: string;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MetaReportConfigInput = Omit<MetaReportConfig, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>;

export function useMetaReportConfigs() {
  return useQuery<MetaReportConfig[]>({
    queryKey: ['meta-report-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_report_configs')
        .select('*')
        .order('client_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMetaReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MetaReportConfigInput) => {
      const { data, error } = await supabase
        .from('meta_report_configs')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-report-configs'] });
      toast.success('Relatório criado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao criar: ' + err.message),
  });
}

export function useUpdateMetaReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaReportConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('meta_report_configs')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-report-configs'] });
      toast.success('Configuração atualizada!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  });
}

export function useDeleteMetaReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meta_report_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-report-configs'] });
      toast.success('Relatório removido');
    },
    onError: (err: any) => toast.error('Erro ao remover: ' + err.message),
  });
}

export function useTriggerMetaReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config_id: string) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-report', {
        body: { config_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meta-report-configs'] });
      const result = data?.results?.[0];
      if (result?.sent) {
        toast.success(`Relatório enviado! (${result.campaigns} campanha${result.campaigns !== 1 ? 's' : ''})`);
      } else {
        toast.error('Erro ao enviar: ' + (result?.error || 'desconhecido'));
      }
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}
