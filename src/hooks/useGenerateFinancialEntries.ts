
import { supabase } from "@/integrations/supabase/client";
import { calcFirstDueDate, effectiveDueDate, holidaysForRange } from "@/lib/businessDays";

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
      .select('id, monthly_value, start_date, end_date, type, single_payment')
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
      const endDate   = new Date(contract.end_date + 'T00:00:00');
      const holidays  = holidaysForRange(startDate.getFullYear(), endDate.getFullYear());

      // Pagamento único: uma cobrança só, valor cheio, na data escolhida —
      // com o mesmo antecipo de dia útil que o Asaas aplica (asaas-new-client),
      // pra não gravar um vencimento local diferente do que existe lá.
      if (contract.single_payment) {
        const dueDateISO = effectiveDueDate(startDate, holidays).toISOString().slice(0, 10);
        const key = `${dueDateISO}_${monthlyValue}`;
        (desiredByKey[key] ||= []).push({
          client_id: clientId,
          user_id:   userId,
          name:      client.company,
          amount:    monthlyValue,
          due_date:  dueDateISO,
          reference: 'Pagamento único',
          status:    'pending',
        });
        continue;
      }

      // Meia-noite do end_date, não 23:59:59: o próprio dia do fim do
      // contrato já pertence ao próximo período de serviço (ou, numa
      // renovação sem intervalo, é literalmente o dia de início do
      // contrato seguinte) — não deve gerar uma cobrança aqui. Com
      // 23:59:59 + comparação ">" o loop tratava o end_date como ainda
      // dentro do período faturável e criava uma parcela extra nesse dia,
      // que duplicava com a 1ª parcela de um contrato renovado que começa
      // no mesmo dia (bug real: Campel teve 2 cobranças de R$640 em
      // 23/07/2026, uma sobrando do contrato vencido e uma do renovado).

      // 1º vencimento com o MESMO ajuste de dia útil do asaas-new-client
      // (antecipa se cair em fim de semana/feriado). O Asaas, ao gerar o
      // parcelamento a partir desse 1º vencimento, cascateia o MESMO dia
      // do mês (clampado) pras parcelas seguintes — sem reconferir dia
      // útil em cada uma. Por isso ancoramos no dia efetivo, não no
      // payment_day cru: senão nosso vencimento local diverge do Asaas
      // todo mês em que o payment_day cair em fim de semana/feriado (foi
      // o que aconteceu com o Mayke Arruda: Asaas mostrava 31/07, 31/08,
      // 30/09... e o nosso banco tinha 01/08, 01/09, 01/10...).
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const base = startDate > today ? startDate : today;
      const firstDue = calcFirstDueDate(base, paymentDay);
      const effDue = effectiveDueDate(firstDue, holidays);
      const anchorDay = effDue.getDate();

      let currentDate = new Date(effDue);

      while (true) {
        const paymentDate = new Date(currentDate);
        paymentDate.setHours(0, 0, 0, 0);
        if (paymentDate >= endDate) break;

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

        // IMPORTANTE: nextMonth precisa nascer com dia=1, não copiar o dia
        // 31 de currentDate e só depois somar o mês — `setMonth` num Date
        // com dia 31 pulando pra um mês de 30 dias transborda pro mês
        // SEGUINTE (ex.: 31/ago + 1 mês vira 01/out, pulando setembro
        // inteiro). anchorDay agora pode ser 29/30/31 (antes o payment_day
        // cru era sempre ≤28, então esse transbordo nunca acontecia).
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        currentDate = setPaymentDay(nextMonth, anchorDay);
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
