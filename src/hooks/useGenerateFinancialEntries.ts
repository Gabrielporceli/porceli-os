
import { supabase } from "@/integrations/supabase/client";

export const generateFinancialEntriesForClient = async (clientId: string, userId: string) => {
  try {
    console.log('DEBUG - Gerando lançamentos financeiros para cliente:', clientId);

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      console.error('Erro ao buscar cliente:', clientError);
      return;
    }

    // Verificar se o cliente tem dados necessários para gerar lançamentos
    if (!client.monthly_value || !client.contract_end || !client.payment_day) {
      console.log('DEBUG - Cliente não tem dados suficientes para gerar lançamentos financeiros');
      return;
    }

    // Verificar lançamentos existentes para este cliente para não duplicar
    const { data: existingEntries } = await supabase
      .from('financial_entries')
      .select('due_date')
      .eq('client_id', clientId)
      .eq('user_id', userId);

    const existingDates = new Set((existingEntries || []).map(e => e.due_date));

    // Gerar todos os lançamentos futuros
    const startDate = new Date(client.start_date || new Date());
    const endDate = new Date(client.contract_end);
    const paymentDay = client.payment_day || 1;

    // Normalizar as datas para evitar problemas de timezone
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999); // Fim do dia

    const financialEntries = [];

    // Função auxiliar para definir o dia de pagamento de forma segura
    const setPaymentDay = (date: Date, day: number) => {
      const newDate = new Date(date);
      newDate.setDate(1); // Primeiro dia do mês
      const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(day, lastDay); // Usa o dia ou o último dia do mês
      newDate.setDate(actualDay);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    };

    // Começar do mês seguinte ao início do contrato ou do mesmo mês se o dia de pagamento ainda não passou
    let currentDate = new Date(startDate);

    if (startDate.getDate() > paymentDay) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Ajustar para o dia de pagamento
    currentDate = setPaymentDay(currentDate, paymentDay);

    while (true) {
      const paymentDate = new Date(currentDate);
      paymentDate.setHours(0, 0, 0, 0);

      // Se o pagamento seria depois do término do contrato, parar
      if (paymentDate > endDate) {
        break;
      }

      // Ajuste de timezone resolvido cortando UTC string na unha
      const year = paymentDate.getFullYear();
      const monthStr = String(paymentDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(paymentDate.getDate()).padStart(2, '0');
      const entryDate = `${year}-${monthStr}-${dayStr}`;

      // Só adicionar se ainda não existir um lançamento (pago ou pendente) neste dia
      if (!existingDates.has(entryDate)) {
        const monthNames = [
          'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];
        const reference = `${monthNames[paymentDate.getMonth()]} de ${paymentDate.getFullYear()}`;

        financialEntries.push({
          client_id: clientId,
          user_id: userId,
          name: client.company,
          amount: client.monthly_value,
          due_date: entryDate,
          reference: reference,
          status: 'pending',
        });
      }

      // Próximo mês
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      currentDate = setPaymentDay(nextMonth, paymentDay);
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
    }

  } catch (error) {
    console.error('Erro ao gerar lançamentos financeiros:', error);
    throw error;
  }
};

// Função para atualizar lançamentos quando cliente for editado
export const updateFinancialEntriesForClient = async (clientId: string, userId: string) => {
  try {
    console.log('DEBUG - Atualizando lançamentos financeiros para cliente:', clientId);

    // Remover lançamentos futuros (não pagos)
    await supabase
      .from('financial_entries')
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    // Gerar novos lançamentos
    await generateFinancialEntriesForClient(clientId, userId);

  } catch (error) {
    console.error('Erro ao atualizar lançamentos financeiros:', error);
    throw error;
  }
};
