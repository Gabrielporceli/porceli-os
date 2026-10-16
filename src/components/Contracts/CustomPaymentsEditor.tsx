import { format } from "date-fns";
import { Bank, Card as CreditCard, Scan } from "iconsax-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export type CustomBilling = "BOLETO" | "PIX" | "CREDIT_CARD";

/** Um pagamento da lista personalizada (o valor fica em centavos, como texto). */
export interface CustomPaymentDraft {
  id: string;
  amountStr: string;
  dueDate: string;
  billingType: CustomBilling;
}

/** O que é gravado em `contracts.custom_payments`. */
export interface CustomPaymentSaved {
  dueDate: string;
  amount: number;
  billingType: CustomBilling;
}

const BILLING = [
  { value: "BOLETO", label: "Boleto", Icon: Bank },
  { value: "PIX", label: "PIX", Icon: Scan },
  { value: "CREDIT_CARD", label: "Cartão", Icon: CreditCard },
] as const;

export const novoPagamento = (dueDate: string, billingType: CustomBilling = "PIX"): CustomPaymentDraft => ({
  id: crypto.randomUUID(),
  amountStr: "",
  dueDate,
  billingType,
});

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const formatAmount = (amountStr: string) => (amountStr ? brl(parseInt(amountStr, 10) / 100) : "");

export const paymentsTotal = (list: CustomPaymentDraft[]) =>
  list.reduce((s, p) => s + parseInt(p.amountStr || "0", 10) / 100, 0);

/** Valida e converte a lista para o formato salvo (ordenada por vencimento). */
export function toSaved(list: CustomPaymentDraft[]): CustomPaymentSaved[] {
  return list
    .map((p) => ({ dueDate: p.dueDate, amount: parseInt(p.amountStr || "0", 10) / 100, billingType: p.billingType }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const paymentsAreValid = (list: CustomPaymentDraft[]) =>
  list.length > 0 && list.every((p) => parseInt(p.amountStr || "0", 10) > 0 && !!p.dueDate);

function parseISO(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

interface Props {
  payments: CustomPaymentDraft[];
  onChange: (next: CustomPaymentDraft[]) => void;
  defaultDate: string;
}

/**
 * Lista de cobranças personalizadas — a mesma ideia do modo "Personalizado" da
 * renegociação: cada pagamento tem valor, vencimento e forma de pagamento
 * próprios, em vez de uma mensalidade fixa.
 */
export function CustomPaymentsEditor({ payments, onChange, defaultDate }: Props) {
  const update = (id: string, patch: Partial<CustomPaymentDraft>) =>
    onChange(payments.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {payments.map((p, i) => (
        <div key={p.id} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Pagamento {i + 1}</span>
            {payments.length > 1 && (
              <button type="button" onClick={() => onChange(payments.filter((x) => x.id !== p.id))} className="acao-texto perigo">
                Remover
              </button>
            )}
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Valor</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatAmount(p.amountStr)}
                  onChange={(e) => update(p.id, { amountStr: e.target.value.replace(/\D/g, "") })}
                  placeholder="R$ 0,00"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white transition-colors focus:border-white/40 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Vencimento</label>
                <DatePicker
                  date={p.dueDate ? parseISO(p.dueDate) : undefined}
                  setDate={(d) => update(p.id, { dueDate: d ? format(d, "yyyy-MM-dd") : "" })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {BILLING.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update(p.id, { billingType: value })}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all",
                    p.billingType === value ? "vidro-roxo text-white" : "border-white/[0.06] bg-white/[0.03] text-white/70 hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => onChange([...payments, novoPagamento(defaultDate)])} className="acao-texto">
        Adicionar Pagamento
      </button>

      <div className="flex justify-between px-1 text-sm">
        <span className="text-white/60">Total dos pagamentos</span>
        <span className="font-bold text-white">{brl(paymentsTotal(payments))}</span>
      </div>
    </div>
  );
}
