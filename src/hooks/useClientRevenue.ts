import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE = 1000;

/**
 * Quanto cada cliente já gerou: a soma dos lançamentos financeiros PAGOS dele
 * (o que de fato entrou), por id de cliente. Pendentes e vencidos não contam.
 * Busca em páginas de 1.000 porque o banco limita o tamanho de cada resposta.
 */
export function useClientRevenue() {
  return useQuery({
    queryKey: ['client-revenue'],
    queryFn: async () => {
      const totals: Record<string, number> = {};
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('financial_entries')
          .select('client_id, amount')
          .eq('status', 'paid')
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        for (const row of data ?? []) {
          if (row.client_id) totals[row.client_id] = (totals[row.client_id] ?? 0) + Number(row.amount ?? 0);
        }
        if (!data || data.length < PAGE) break;
      }
      return totals;
    },
  });
}
