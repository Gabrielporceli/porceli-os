
import { supabase } from "@/integrations/supabase/client";

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// Ajusta a data para o dia de pagamento do mês, respeitando o último dia do mês
const setPaymentDay = (date: Date, day: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(1);
  const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
  newDate.setDate(Math.min(day, lastDay));
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Gera lançamentos financeiros para o cliente iterando sobre TODOS os contratos
 * ativos/a vencer, em vez de depender dos campos únicos da tabela clients.
 * Isso garante que clientes com múltiplos contratos simultâneos sejam tratados corretamente.
 */
export const generateFinancialEntriesForClient = async (clientId: string, userId: string) => {
  try {
    console.log('DEBUG - Gerando lançamentos financeiros para cliente:', clientId);

    // 1. Buscar dados do cliente (para payment_day e nome)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('company, payment_day')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      console.error('Erro ao buscar cliente:', clientError);
      return;
    }

    if (!client.payment_day) {
      console.log('DEBUG - Cliente não tem payment_day configurado');
      return;
    }

    // 2. Buscar contratos ativos do cliente
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select('id, monthly_value, start_date, end_date, type')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .in('status', ['active', 'expiring']);

    if (!activeContracts || activeContracts.length === 0) {
      console.log('DEBUG - Nenhum contrato ativo para gerar lançamentos');
      return;
    }

    // 3. Buscar lançamentos existentes — contamos QUANTOS existem por (due_date + amount).
    // Isso é crucial: um cliente pode ter 2 contratos de mesmo valor/data, gerando
    // 2 lançamentos legítimos na mesma data. A dedup por contagem evita tanto duplicar
    // numa re-execução quanto colapsar contratos distintos numa única entrada.
    const { data: existingEntries } = await supabase
      .from('financial_entries')
      .select('due_date, amount')
      .eq('client_id', clientId)
      .eq('user_id', userId);

    const existingCount: Record<string, number> = {};
    for (const e of existingEntries || []) {
      const k = `${e.due_date}_${Number(e.amount)}`;
      existingCount[k] = (existingCount[k] || 0) + 1;
    }

    const paymentDay = client.payment_day;

    type Entry = {
      client_id: string; user_id: string; name: string;
      amount: number; due_date: string; reference: string; status: string;
    };

    // 4. Monta a lista DESEJADA de todas as parcelas de TODOS os contratos ativos
    // (permitindo duplicatas de mesma data+valor quando vêm de contratos diferentes)
    const desiredByKey: Record<string, Entry[]> = {};

    for (const contract of activeContracts) {
      const monthlyValue = Number(contract.monthly_value);
      if (!monthlyValue || !contract.end_date || !contract.start_date) continue;

      const startDate = new Date(contract.start_date + 'T00:00:00');
      const endDate   = new Date(contract.end_date   + 'T23:59:59');

      let currentDate = new Date(startDate);
      if (startDate.getDate() > paymentDay) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      currentDate = setPaymentDay(currentDate, paymentDay);

      while (true) {
        const paymentDate = new Date(currentDate);
        paymentDate.setHours(0, 0, 0, 0);
        if (paymentDate > endDate) break;

        const year     = paymentDate.getFullYear();
        const monthStr = String(paymentDate.getMonth() + 1).padStart(2, '0');
        const dayStr   = String(paymentDate.getDate()).padStart(2, '0');
        const entryDate = `${year}-${monthStr}-${dayStr}`;
        const key = `${entryDate}_${monthlyValue}`;

        (desiredByKey[key] ||= []).push({
          client_id: clientId,
          user_id:   userId,
          name:      client.company,
          amount:    monthlyValue,
          due_date:  entryDate,
          reference: `${monthNames[paymentDate.getMonth()]} de ${year}`,
          status:    'pending',
        });

        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        currentDate = setPaymentDay(nextMonth, paymentDay);
      }
    }

    // 5. Para cada (data+valor), insere apenas a diferença entre o desejado e o existente
    const financialEntries: Entry[] = [];
    for (const [key, items] of Object.entries(desiredByKey)) {
      const have = existingCount[key] || 0;
      const need = items.length - have;
      for (let i = 0; i < need; i++) {
        financialEntries.push(items[i]);
      }
    }

    if (financialEntries.length > 0) {
      console.log(`DEBUG - Criando ${financialEntries.length} lançamentos financeiros`);
      const { error: insertError } = await supabase
        .from('financial_entries')
        .insert(financialEntries);

      if (insertError) {
        console.error('Erro ao inserir lançamentos financeiros:', insertError);
        throw insertError;
      } else {
        console.log('DEBUG - Lançamentos financeiros criados com sucesso');
      }
    } else {
      console.log('DEBUG - Nenhum lançamento novo a criar');
    }

  } catch (error) {
    console.error('Erro ao gerar lançamentos financeiros:', error);
    throw error;
  }
};

// Atualiza lançamentos quando contrato for editado/renovado:
// remove os pendentes e regenera com a nova lógica por contrato
export const updateFinancialEntriesForClient = async (clientId: string, userId: string) => {
  try {
    console.log('DEBUG - Atualizando lançamentos financeiros para cliente:', clientId);

    await supabase
      .from('financial_entries')
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    await generateFinancialEntriesForClient(clientId, userId);

  } catch (error) {
    console.error('Erro ao atualizar lançamentos financeiros:', error);
    throw error;
  }
};
