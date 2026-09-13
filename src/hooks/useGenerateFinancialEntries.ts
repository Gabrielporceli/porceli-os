
import { supabase } from "@/integrations/supabase/client";
import { computeContractBilling } from "@/lib/contractBilling";

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
      .select('id, monthly_value, start_date, end_date, type, single_payment, status')
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
      if (!monthlyValue || !contract.start_date) continue;
      if (!contract.single_payment && !contract.end_date) continue;

      // Trava contra o bug da renovação (caso real: CP Cann Consultoria,
      // 10/09/2026): um contrato antigo do mesmo `type` que ainda esteja
      // 'expiring' no banco (a inativação não é imediata na renovação —
      // decisão deliberada, ver useContracts.ts) não pode gerar parcela pra
      // uma data que o contrato RENOVADO (mesmo tipo, começa depois) já
      // cobre — senão os dois cobram o mesmo mês. Corta o fim efetivo do
      // contrato mais antigo no início do sucessor mais próximo.
      //
      // Só aplica a contrato 'expiring' — NUNCA a 'active'. Sem esse filtro
      // de status, dois contratos genuinamente paralelos do mesmo type
      // (ex.: duas campanhas Google simultâneas, ambas 'active') cortariam
      // a cobrança um do outro por engano — não há vínculo explícito no
      // banco entre "contrato renovado" e "contrato original" pra
      // diferenciar os dois casos por outro campo. 'expiring' é sinal
      // suficiente porque só entra nesse status quando o usuário está
      // encerrando/substituindo o contrato, nunca por coincidência.
      const successorStart = contract.status !== 'expiring' ? undefined : activeContracts
        .filter(c => c.id !== contract.id && c.type === contract.type && c.start_date > contract.start_date)
        .map(c => c.start_date)
        .sort()[0];
      const effectiveEndDate = successorStart && successorStart < (contract.end_date ?? contract.start_date)
        ? successorStart
        : (contract.end_date ?? contract.start_date);

      // Mesma função usada na preview dos modais de contrato (NewContractModal
      // / RenewContractModal) — garante que o que o usuário vê antes de
      // confirmar é EXATAMENTE o que vira lançamento aqui.
      const billing = computeContractBilling({
        startDate: contract.start_date,
        endDate: effectiveEndDate,
        paymentDay,
        value: monthlyValue,
        singlePayment: !!contract.single_payment,
      });

      for (const item of billing) {
        const key = `${item.dueDate}_${monthlyValue}`;
        (desiredByKey[key] ||= []).push({
          client_id: clientId,
          user_id:   userId,
          name:      client.company,
          amount:    monthlyValue,
          due_date:  item.dueDate,
          reference: item.reference,
          status:    'pending',
        });
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

    // Só apaga pendentes com vencimento AINDA NÃO passado. generateFinancialEntriesForClient
    // só cria parcelas a partir de hoje pra frente (base = max(startDate, hoje)) — então um
    // pendente já vencido nunca seria recriado se fosse apagado aqui. Apagar sem esse filtro
    // apagava boletos vencidos e não pagos pra sempre, sem substituto (caso real: Nova House,
    // 5 meses de cobrança vencida em aberto sumiram do sistema ao editar o contrato).
    const todayISO = new Date().toISOString().slice(0, 10);
    await supabase
      .from('financial_entries')
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('due_date', todayISO);

    await generateFinancialEntriesForClient(clientId, userId);

  } catch (error) {
    console.error('Erro ao atualizar lançamentos financeiros:', error);
    throw error;
  }
};
