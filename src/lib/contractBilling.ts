// Fonte única da lógica de "quais cobranças um contrato vai gerar". Usado
// tanto pela geração real de financial_entries (useGenerateFinancialEntries)
// quanto pela preview nos modais de contrato — pra a preview NUNCA divergir
// do que de fato é criado (foi divergência entre "o que a gente acha que vai
// cobrar" e "o que o Asaas realmente cobra" que causou boa parte dos bugs de
// data desta sessão).

import { calcFirstDueDate, effectiveDueDate, holidaysForRange } from "./businessDays";

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

export type ContractBillingInput = {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd — ignorado se singlePayment
  paymentDay: number;
  value: number;
  singlePayment: boolean;
  /** Só pra testes/preview determinística. Default: hoje. */
  today?: Date;
};

export type ContractBillingItem = {
  dueDate: string; // yyyy-MM-dd
  amount: number;
  reference: string;
};

export function computeContractBilling(input: ContractBillingInput): ContractBillingItem[] {
  const { startDate: startISO, endDate: endISO, paymentDay, value, singlePayment } = input;
  if (!startISO || !value) return [];

  const startDate = new Date(startISO + 'T00:00:00');
  if (Number.isNaN(startDate.getTime())) return [];

  if (singlePayment) {
    const holidays = holidaysForRange(startDate.getFullYear(), startDate.getFullYear());
    const dueDateISO = effectiveDueDate(startDate, holidays).toISOString().slice(0, 10);
    return [{ dueDate: dueDateISO, amount: value, reference: 'Pagamento único' }];
  }

  if (!endISO) return [];
  const endDate = new Date(endISO + 'T00:00:00');
  if (Number.isNaN(endDate.getTime())) return [];

  const holidays = holidaysForRange(startDate.getFullYear(), endDate.getFullYear());
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(0, 0, 0, 0);

  // Mesma âncora que a geração real: se o contrato começa no passado, as
  // parcelas só nascem a partir de hoje pra frente (parcelas já vencidas não
  // são recriadas retroativamente).
  const base = startDate > today ? startDate : today;
  const firstDue = calcFirstDueDate(base, paymentDay);
  const effDue = effectiveDueDate(firstDue, holidays);
  const anchorDay = effDue.getDate();

  const items: ContractBillingItem[] = [];
  let currentDate = new Date(effDue);
  let guard = 0;

  while (guard++ < 240) { // trava de segurança — nunca deveria chegar perto disso
    const paymentDate = new Date(currentDate);
    paymentDate.setHours(0, 0, 0, 0);
    if (paymentDate >= endDate) break;

    const year     = paymentDate.getFullYear();
    const monthStr = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const dayStr   = String(paymentDate.getDate()).padStart(2, '0');

    items.push({
      dueDate: `${year}-${monthStr}-${dayStr}`,
      amount: value,
      reference: `${monthNames[paymentDate.getMonth()]} de ${year}`,
    });

    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    currentDate = setPaymentDay(nextMonth, anchorDay);
  }

  return items;
}
