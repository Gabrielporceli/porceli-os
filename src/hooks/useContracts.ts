
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { generateFinancialEntriesForClient } from './useGenerateFinancialEntries';

type Contract = Tables<'contracts'>;
type ContractInsert = TablesInsert<'contracts'>;
type ContractUpdate = TablesUpdate<'contracts'>;

export const useContracts = () => {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      // Verificar autenticação antes de fazer query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Atualizar tags de clientes baseado no vencimento dos contratos
      // Isso garante que as tags estejam sempre atualizadas
      try {
        await (supabase.rpc as any)('update_client_tags_from_contracts');
      } catch (rpcError) {
        // Não falhar a query se a atualização de tags falhar
        console.warn('Erro ao atualizar tags de clientes:', rpcError);
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }

      return data;
    },
    // Previne execução sem autenticação
    retry: false,
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payment_day, ...contract }: Omit<ContractInsert, 'user_id'> & { payment_day?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('contracts')
        .insert({ ...contract, user_id: user.id })
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        throw error;
      }

      // Sync with client table
      if (data.client_id) {
        const updates: any = {
          start_date: data.start_date,
          contract_end: data.end_date,
          monthly_value: data.monthly_value,
          plan: data.type,
          updated_at: new Date().toISOString()
        };
        
        if (payment_day !== undefined) {
          updates.payment_day = payment_day;
        }

        await supabase
          .from('clients')
          .update(updates)
          .eq('id', data.client_id)
          .eq('user_id', user.id);

        // Update financial entries
        try {
          await generateFinancialEntriesForClient(data.client_id, user.id);
        } catch (err) {
          console.error('Error generating financial entries:', err);
        }

        // Trigger webhook
        try {
          const finalPaymentDay = payment_day !== undefined ? payment_day : (data.client?.payment_day || 1);
          
          await supabase.functions.invoke('send-client-webhook', {
            body: {
              ...data.client,
              plan: data.type,
              contract_end: data.end_date,
              start_date: data.start_date,
              payment_day: finalPaymentDay,
              monthly_value: data.monthly_value,
              event: 'contract_created',
              updated_at: new Date().toISOString()
            }
          });
        } catch (webhookErr) {
          console.error('Erro ao enviar webhook de criação:', webhookErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error) => {
      console.error('Create contract error:', error);
      toast.error('Erro ao criar contrato');
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payment_day, ...updates }: ContractUpdate & { id: string, payment_day?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) {
        console.error('Error updating contract:', error);
        throw error;
      }

      // Sync with client table if it's the most recent contract or if we want to force update
      if (data.client_id) {
        const clientUpdates: any = {
          start_date: data.start_date,
          contract_end: data.end_date,
          monthly_value: data.monthly_value,
          plan: data.type,
          updated_at: new Date().toISOString()
        };
        
        if (payment_day !== undefined) {
          clientUpdates.payment_day = payment_day;
        }

        await supabase
          .from('clients')
          .update(clientUpdates)
          .eq('id', data.client_id)
          .eq('user_id', user.id);

        // Refresh financial entries
        try {
          const { updateFinancialEntriesForClient } = await import('./useGenerateFinancialEntries');
          await updateFinancialEntriesForClient(data.client_id, user.id);
        } catch (err) {
          console.error('Error updating financial entries:', err);
        }

        // Trigger webhook
        try {
          const finalPaymentDay = payment_day !== undefined ? payment_day : (data.client?.payment_day || 1);
          
          await supabase.functions.invoke('send-client-webhook', {
            body: {
              ...data.client,
              plan: data.type,
              contract_end: data.end_date,
              start_date: data.start_date,
              payment_day: finalPaymentDay,
              monthly_value: data.monthly_value,
              event: 'contract_updated',
              updated_at: new Date().toISOString()
            }
          });
        } catch (webhookErr) {
          console.error('Erro ao enviar webhook de atualização:', webhookErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Contrato atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Update contract error:', error);
      toast.error('Erro ao atualizar contrato');
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contract:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Delete contract error:', error);
      toast.error('Erro ao excluir contrato');
    },
  });
};

export const useRenewContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractId,
      type,
      monthlyValue,
      startDate,
      endDate,
      paymentDay,
      contract_url
    }: {
      contractId: string,
      type?: string,
      monthlyValue?: number,
      startDate?: string,
      endDate?: string,
      paymentDay?: number,
      contract_url?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Buscar o contrato atual
      const { data: currentContract, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', contractId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !currentContract) {
        throw new Error('Contrato não encontrado');
      }

      // Calcular valores padrão se não fornecidos
      const currentEndDate = new Date(currentContract.end_date);

      // Calcular duração original se as datas não forem fornecidas
      const originalStartDate = new Date(currentContract.start_date);
      const originalEndDate = new Date(currentContract.end_date);
      const originalDiffTime = originalEndDate.getTime() - originalStartDate.getTime();
      const originalDiffDays = Math.ceil(originalDiffTime / (1000 * 60 * 60 * 24));

      const finalStartDate = startDate || (() => {
        const d = new Date(currentEndDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })();

      const finalEndDate = endDate || (() => {
        const d = new Date(finalStartDate);
        d.setDate(d.getDate() + originalDiffDays);
        return d.toISOString().split('T')[0];
      })();

      const finalType = type || currentContract.type;
      const finalMonthlyValue = monthlyValue !== undefined ? monthlyValue : currentContract.monthly_value;

      // Note: We no longer inactivate the previous contract immediately upon renewal/extension
      // as requested by the user, allowing both to remain active until completion.

      // Criar novo contrato
      const { data: newContract, error: createError } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          client_id: currentContract.client_id,
          type: finalType,
          monthly_value: finalMonthlyValue,
          start_date: finalStartDate,
          end_date: finalEndDate,
          status: 'active',
          contract_url: contract_url
        })
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (createError) {
        console.error('Error creating renewed contract:', createError);
        throw createError;
      }

      // Atualizar cliente com as novas datas do contrato renovado
      if (newContract.client_id) {
        try {
          const finalPaymentDay = paymentDay !== undefined ? paymentDay : (currentContract.client?.payment_day || 1);
          
          await supabase
            .from('clients')
            .update({
              start_date: finalStartDate,
              contract_end: finalEndDate,
              monthly_value: finalMonthlyValue,
              plan: finalType,
              payment_day: finalPaymentDay,
              tags: ['Ativo'],
              updated_at: new Date().toISOString()
            })
            .eq('id', newContract.client_id)
            .eq('user_id', user.id);

          // Gerar novas faturas financeiras para o contrato renovado
          try {
            await generateFinancialEntriesForClient(newContract.client_id, user.id);
            console.log('Faturas financeiras geradas para contrato renovado');
          } catch (finError) {
            console.error('Erro ao gerar faturas financeiras:', finError);
          }
        } catch (clientUpdateError) {
          console.error('Erro ao atualizar datas do cliente:', clientUpdateError);
        }
      }

      // Enviar webhook com dados do cliente renovado
      if (newContract.client) {
        try {
          const finalPaymentDay = paymentDay !== undefined ? paymentDay : (newContract.client.payment_day || 1);
          
          const { error: webhookError } = await supabase.functions.invoke('send-client-webhook', {
            body: {
              id: newContract.client.id,
              company: newContract.client.company,
              cnpj: newContract.client.cnpj,
              responsible: newContract.client.responsible,
              phone: newContract.client.phone,
              email: newContract.client.email,
              group_id: newContract.client.group_id,
              plan: newContract.client.plan,
              contract_end: newContract.end_date,
              start_date: newContract.start_date,
              payment_day: finalPaymentDay,
              monthly_value: newContract.monthly_value,
              address: newContract.client.address,
              tags: newContract.client.tags,
              user_id: newContract.client.user_id,
              created_at: newContract.created_at,
              updated_at: newContract.updated_at,
              event: 'contract_renewed',
              previous_contract_end: currentContract.end_date,
              contract_duration_days: originalDiffDays
            }
          });

          if (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }
        } catch (webhookErr) {
          console.error('Erro ao chamar edge function do webhook:', webhookErr);
        }
      }

      return newContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Contrato renovado com sucesso!');
    },
    onError: (error) => {
      console.error('Renew contract error:', error);
      toast.error('Erro ao renovar contrato');
    },
  });
};
