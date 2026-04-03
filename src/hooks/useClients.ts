import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { generateFinancialEntriesForClient, updateFinancialEntriesForClient } from './useGenerateFinancialEntries';

type Client = Tables<'clients'>;
type ClientInsert = TablesInsert<'clients'>;
type ClientUpdate = TablesUpdate<'clients'>;

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Atualizar tags de clientes baseado no vencimento dos contratos
      // Isso garante que as tags estejam sempre atualizadas
      try {
        await supabase.rpc('update_client_tags_from_contracts');
      } catch (rpcError) {
        // Não falhar a query se a atualização de tags falhar
        console.warn('Erro ao atualizar tags de clientes:', rpcError);
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      return data as Client[];
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('DEBUG - Criando cliente com dados:', client);
      console.log('DEBUG - Tipos dos dados:', {
        contract_end: typeof client.contract_end,
        start_date: typeof client.start_date,
        monthly_value: typeof client.monthly_value,
        payment_day: typeof client.payment_day
      });

      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating client:', error);
        throw error;
      }

      console.log('DEBUG - Cliente criado:', data);
      console.log('DEBUG - Dados salvos no banco:', {
        contract_end: data.contract_end,
        start_date: data.start_date,
        monthly_value: data.monthly_value,
        payment_day: data.payment_day
      });

      // Enviar webhook para o cliente criado
      try {
        console.log('DEBUG - Enviando webhook para cliente criado');
        const { data: webhookResult, error: webhookError } = await supabase.functions.invoke('send-client-webhook', {
          body: {
            id: data.id,
            company: data.company,
            cnpj: data.cnpj,
            responsible: data.responsible,
            phone: data.phone,
            email: data.email,
            grupo_id: data.grupo_id,
            plan: data.plan,
            contract_end: data.contract_end,
            start_date: data.start_date,
            payment_day: data.payment_day,
            monthly_value: data.monthly_value,
            address: data.address,
            tags: data.tags,
            user_id: data.user_id,
            created_at: data.created_at,
            updated_at: data.updated_at
          }
        });

        if (webhookError) {
          console.error('Erro ao enviar webhook:', webhookError);
          // Não falhar a criação do cliente por causa do webhook
        } else {
          console.log('Webhook enviado com sucesso:', webhookResult);
        }
      } catch (webhookErr) {
        console.error('Erro ao chamar edge function do webhook:', webhookErr);
        // Não falhar a criação do cliente por causa do webhook
      }

      // Gerar lançamentos financeiros automaticamente se cliente tem dados de contrato
      if (client.monthly_value && client.contract_end && client.payment_day) {
        console.log('DEBUG - Gerando lançamentos financeiros para cliente criado');
        try {
          await generateFinancialEntriesForClient(data.id, user.id);
        } catch (finError) {
          console.error('Erro ao gerar lançamentos financeiros:', finError);
          // Não falhar a criação do cliente por causa dos lançamentos
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error) => {
      console.error('Create client error:', error);
      toast.error('Erro ao criar cliente');
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('DEBUG - Atualizando cliente:', id, updates);
      console.log('DEBUG - Tipos dos dados de atualização:', {
        contract_end: typeof updates.contract_end,
        start_date: typeof updates.start_date,
        monthly_value: typeof updates.monthly_value,
        payment_day: typeof updates.payment_day
      });

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating client:', error);
        throw error;
      }

      console.log('DEBUG - Cliente atualizado:', data);
      console.log('DEBUG - Dados atualizados no banco:', {
        contract_end: data.contract_end,
        start_date: data.start_date,
        monthly_value: data.monthly_value,
        payment_day: data.payment_day
      });

      // Atualizar lançamentos financeiros se dados do contrato foram alterados
      if (updates.monthly_value !== undefined || updates.contract_end !== undefined || updates.payment_day !== undefined) {
        console.log('DEBUG - Atualizando lançamentos financeiros para cliente editado');
        try {
          await updateFinancialEntriesForClient(id, user.id);
        } catch (finError) {
          console.error('Erro ao atualizar lançamentos financeiros:', finError);
          // Não falhar a atualização do cliente por causa dos lançamentos
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Update client error:', error);
      toast.error('Erro ao atualizar cliente');
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting client:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Delete client error:', error);
      toast.error('Erro ao excluir cliente');
    },
  });
};
