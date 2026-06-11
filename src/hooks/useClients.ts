import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { updateFinancialEntriesForClient } from './useGenerateFinancialEntries';
import { geocodeAddress } from '@/lib/geocode';

type Client = Tables<'clients'>;
type ClientInsert = TablesInsert<'clients'>;
type ClientUpdate = TablesUpdate<'clients'>;

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    staleTime: 0,
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

      // Geocodificar endereço antes de inserir
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (client.address) {
        const coords = await geocodeAddress(client.address);
        if (coords) { latitude = coords.lat; longitude = coords.lng; }
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, user_id: user.id, latitude, longitude } as any)
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

      // NOTA: a criação de cliente NÃO dispara mais o Asaas nem gera cobranças.
      // Isso agora é responsabilidade exclusiva da criação de contrato (aba Contratos),
      // evitando duplicação de cobranças e separando os fluxos.

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

      // Re-geocodificar se o endereço foi alterado
      let geoUpdates: { latitude?: number | null; longitude?: number | null } = {};
      if (updates.address !== undefined) {
        if (updates.address) {
          const coords = await geocodeAddress(updates.address);
          geoUpdates = coords ? { latitude: coords.lat, longitude: coords.lng } : { latitude: null, longitude: null };
        } else {
          geoUpdates = { latitude: null, longitude: null };
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, ...geoUpdates } as any)
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
