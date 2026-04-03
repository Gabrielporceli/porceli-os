
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Plan = Tables<'plans'>;
type PlanInsert = TablesInsert<'plans'>;
type PlanUpdate = TablesUpdate<'plans'>;

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      // Verificar autenticação antes de fazer query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }

      return data as Plan[];
    },
    // Previne execução sem autenticação
    retry: false,
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: Omit<PlanInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plans')
        .insert({ ...plan, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating plan:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano criado com sucesso!');
    },
    onError: (error) => {
      console.error('Create plan error:', error);
      toast.error('Erro ao criar plano');
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PlanUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating plan:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Update plan error:', error);
      toast.error('Erro ao atualizar plano');
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting plan:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Delete plan error:', error);
      toast.error('Erro ao excluir plano');
    },
  });
};
