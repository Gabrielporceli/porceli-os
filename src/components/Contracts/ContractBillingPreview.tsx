import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { computeContractBilling } from "@/lib/contractBilling";

interface ContractBillingPreviewProps {
  startDate: string;
  endDate: string;
  paymentDay: number;
  value: number;
  singlePayment: boolean;
}

const currency = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
};

const MAX_VISIBLE = 6;

export function ContractBillingPreview({ startDate, endDate, paymentDay, value, singlePayment }: ContractBillingPreviewProps) {
  const items = useMemo(
    () => computeContractBilling({ startDate, endDate, paymentDay, value, singlePayment }),
    [startDate, endDate, paymentDay, value, singlePayment]
  );

  if (!value || !startDate || (!singlePayment && !endDate)) return null;

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-500/80 font-medium">
        Nenhuma cobrança seria gerada com essas datas — confira o período do contrato.
      </div>
    );
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - visible.length;
  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5 text-white/30" />
          <Label>Preview das Cobranças ({items.length})</Label>
        </div>
        {items.length > 1 && (
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
            Total {currency(total)}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] divide-y divide-white/[0.05] overflow-hidden">
        {visible.map((item, idx) => (
          <div key={`${item.dueDate}-${idx}`} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-white/60 text-xs font-medium capitalize">
              {singlePayment ? formatDate(item.dueDate) : item.reference}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-[11px]">{formatDate(item.dueDate)}</span>
              <span className="text-white text-xs font-bold">{currency(item.amount)}</span>
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-4 py-2 text-center text-[11px] text-white/30 font-medium">
            + {hiddenCount} cobrança{hiddenCount > 1 ? 's' : ''} até {formatDate(items[items.length - 1].dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
      {children}
    </span>
  );
}
