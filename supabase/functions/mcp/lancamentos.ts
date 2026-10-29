// Lançamentos financeiros gerados dos contratos — mesma lógica de
// src/hooks/useGenerateFinancialEntries.ts (a tela). O cálculo das parcelas
// é o MESMO arquivo que a tela usa (src/lib/contractBilling.ts): a data e o
// valor de cada cobrança nunca divergem entre tela e Hermes.
import { computeContractBilling } from "../../../src/lib/contractBilling.ts";
import { db } from "./contexto.ts";

type Entry = {
  client_id: string; user_id: string; name: string;
  amount: number; due_date: string; reference: string; status: string;
};

/** Cria os lançamentos que faltam para todos os contratos ativos/a vencer do cliente. */
export async function gerarLancamentosDoCliente(clientId: string, userId: string): Promise<number> {
  const { data: client } = await db.from("clients")
    .select("company, payment_day").eq("id", clientId).eq("user_id", userId).single();
  if (!client || !client.payment_day) return 0;

  const { data: activeContracts } = await db.from("contracts")
    .select("id, monthly_value, start_date, end_date, type, single_payment, status, custom_payments")
    .eq("client_id", clientId).eq("user_id", userId).in("status", ["active", "expiring"]);
  if (!activeContracts || activeContracts.length === 0) return 0;

  // Dedup por CONTAGEM de (vencimento + valor): dois contratos de mesmo valor
  // e data geram dois lançamentos legítimos.
  const { data: existingEntries } = await db.from("financial_entries")
    .select("due_date, amount").eq("client_id", clientId).eq("user_id", userId);
  const existingCount: Record<string, number> = {};
  for (const e of existingEntries || []) {
    const k = `${e.due_date}_${Number(e.amount)}`;
    existingCount[k] = (existingCount[k] || 0) + 1;
  }

  const desiredByKey: Record<string, Entry[]> = {};
  for (const contract of activeContracts) {
    const custom = Array.isArray(contract.custom_payments)
      ? (contract.custom_payments as { dueDate: string; amount: number }[])
      : null;
    if (custom && custom.length > 0) {
      custom.forEach((pay, i) => {
        const amount = Number(pay.amount);
        if (!amount || !pay.dueDate) return;
        (desiredByKey[`${pay.dueDate}_${amount}`] ||= []).push({
          client_id: clientId, user_id: userId, name: client.company, amount,
          due_date: pay.dueDate, reference: `${contract.type} — Pagamento ${i + 1}/${custom.length}`, status: "pending",
        });
      });
      continue;
    }

    const monthlyValue = Number(contract.monthly_value);
    if (!monthlyValue || !contract.start_date) continue;
    if (!contract.single_payment && !contract.end_date) continue;

    // Trava da renovação: contrato 'expiring' não cobra o período que o
    // sucessor do mesmo tipo já cobre (ver comentário na tela).
    const successorStart = contract.status !== "expiring" ? undefined : activeContracts
      .filter((c) => c.id !== contract.id && c.type === contract.type && c.start_date > contract.start_date)
      .map((c) => c.start_date).sort()[0];
    const effectiveEndDate = successorStart && successorStart < (contract.end_date ?? contract.start_date)
      ? successorStart
      : (contract.end_date ?? contract.start_date);

    const billing = computeContractBilling({
      startDate: contract.start_date, endDate: effectiveEndDate, paymentDay: client.payment_day,
      value: monthlyValue, singlePayment: !!contract.single_payment,
    });
    for (const item of billing) {
      (desiredByKey[`${item.dueDate}_${monthlyValue}`] ||= []).push({
        client_id: clientId, user_id: userId, name: client.company, amount: monthlyValue,
        due_date: item.dueDate, reference: item.reference, status: "pending",
      });
    }
  }

  const novos: Entry[] = [];
  for (const [key, items] of Object.entries(desiredByKey)) {
    const need = items.length - (existingCount[key] || 0);
    for (let i = 0; i < need; i++) novos.push(items[i]);
  }
  if (novos.length > 0) {
    const { error } = await db.from("financial_entries").insert(novos);
    if (error) throw new Error(`lançamentos: ${error.message}`);
  }
  return novos.length;
}

/**
 * Contrato editado/renovado: apaga os pendentes AINDA NÃO vencidos e regera.
 * Pendente vencido fica — a geração só cria de hoje em diante, e apagá-lo
 * sumiria com cobrança em aberto (caso real: Nova House).
 */
export async function atualizarLancamentosDoCliente(clientId: string, userId: string): Promise<number> {
  const todayISO = new Date().toISOString().slice(0, 10);
  await db.from("financial_entries").delete()
    .eq("client_id", clientId).eq("user_id", userId).eq("status", "pending").gte("due_date", todayISO);
  return await gerarLancamentosDoCliente(clientId, userId);
}

/** Soma das mensalidades dos contratos ativos/a vencer (o `monthly_value` do cliente). */
export function valorMensalTotal(
  contratos: { monthly_value: unknown; status: string; end_date: string | null }[],
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return contratos
    .filter((c) => {
      if (c.status === "active" || c.status === "expiring") return true;
      return c.end_date ? new Date(c.end_date) >= today : false;
    })
    .reduce((s, c) => s + (Number(c.monthly_value) || 0), 0);
}
