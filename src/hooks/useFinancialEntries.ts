
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateFinancialEntriesForClient } from "./useGenerateFinancialEntries";

export const useFinancialEntries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar lançamentos financeiros
  const { data: financialEntries = [], isLoading: financialEntriesLoading, refetch } = useQuery({
    queryKey: ['financial-entries', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('DEBUG - Buscando lançamentos financeiros para usuário:', user.id);

      const { data, error } = await supabase
        .from('financial_entries')
        .select(`
          *,
          clients (
            company,
            cnpj,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar lançamentos financeiros:', error);
        throw error;
      }

      console.log('DEBUG - Lançamentos financeiros encontrados:', data?.length || 0);
      console.log('DEBUG - Dados dos lançamentos:', data?.map(e => ({ name: e.name, status: e.status, due_date: e.due_date })));
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Marcar como pago
  const markAsPaidMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('DEBUG - Marcando lançamento como pago:', entryId);

      const { data: updatedEntry, error } = await supabase
        .from('financial_entries')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao marcar como pago:', error);
        throw error;
      }

      return updatedEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      refetch();

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error marking as paid:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Gerar lançamentos financeiros para clientes que não os têm
  const generateMissingEntriesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('DEBUG - Verificando clientes sem lançamentos financeiros');

      // Buscar todos os clientes do usuário
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      if (clientsError) {
        console.error('Erro ao buscar clientes:', clientsError);
        throw clientsError;
      }

      let generatedCount = 0;

      for (const client of clients || []) {
        // Verificar se o cliente tem dados necessários
        if (client.monthly_value && client.contract_end && client.payment_day) {
          console.log(`DEBUG - Processando lançamentos para cliente: ${client.company}`);
          try {
            await generateFinancialEntriesForClient(client.id, user.id);
            generatedCount++;
          } catch (error) {
            console.error(`Erro ao processar lançamentos para ${client.company}:`, error);
          }
        }
      }

      return generatedCount;
    },
    onSuccess: (generatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      refetch();

      toast({
        title: "Sucesso",
        description: `${generatedCount} lançamentos financeiros foram gerados!`,
      });
    },
    onError: (error) => {
      console.error('Error generating missing entries:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar lançamentos financeiros. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    financialEntries,
    financialEntriesLoading,
    markAsPaid: markAsPaidMutation.mutate,
    isMarkingAsPaid: markAsPaidMutation.isPending,
    generateMissingEntries: generateMissingEntriesMutation.mutate,
    isGeneratingEntries: generateMissingEntriesMutation.isPending,
    refetch,
  };
};
