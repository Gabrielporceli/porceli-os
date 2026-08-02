import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { LineChart, Users, DollarSign, Wallet, TrendingUp, Percent, Target, UserCheck, X } from 'lucide-react';
import type { ForecastSummary } from '../../../lib/funnelMath';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { useFunnelActions } from '../funnelContext';

type ForecastNodeProps = NodeProps & { data: { computed?: ForecastSummary } };

function ForecastNodeImpl({ id, data }: ForecastNodeProps) {
  const { deleteNode } = useFunnelActions();
  const s = data.computed ?? { people: 0, leads: 0, revenue: 0, expenses: 0, profit: 0, cpl: null, roi: null };

  return (
    <div className="group nodrag w-80 rounded-xl border border-porceli-gray-700 bg-porceli-gray-900 shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-porceli-gray-800 px-3 py-2">
        <LineChart size={14} className="text-porceli-purpleLight" />
        <span className="flex-1 text-xs font-semibold text-porceli-gray-200">Forecast</span>
        <button
          type="button"
          onClick={() => deleteNode(id)}
          className="text-porceli-gray-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          title="Remover"
        >
          <X size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-porceli-gray-800">
        <Stat icon={Users} color="#0ea5e9" label="Pessoas" value={formatNumber(s.people)} />
        <Stat icon={UserCheck} color="#f59e0b" label="Leads / Conversões" value={formatNumber(s.leads)} />
        <Stat icon={DollarSign} color="#22c55e" label="Receita" value={formatCurrency(s.revenue)} />
        <Stat icon={Wallet} color="#ef4444" label="Investimento" value={formatCurrency(s.expenses)} />
        <Stat icon={Target} color="#0ea5e9" label="Custo / lead" value={s.cpl === null ? '—' : formatCurrency(s.cpl)} />
        <Stat icon={TrendingUp} color="#6829c0" label="Lucro" value={formatCurrency(s.profit)} />
      </div>
      <div className="flex items-center justify-between border-t border-porceli-gray-800 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] text-porceli-gray-400">
          <Percent size={12} /> Retorno sobre investimento
        </span>
        <span className="text-sm font-bold text-porceli-gray-100">{s.roi === null ? '—' : `${s.roi.toFixed(2)}x`}</span>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Users;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-porceli-gray-900 p-3">
      <span className="flex items-center gap-1.5 text-[11px] text-porceli-gray-500">
        <Icon size={12} color={color} /> {label}
      </span>
      <span className="text-base font-bold text-porceli-gray-100">{value}</span>
    </div>
  );
}

export const ForecastNode = memo(ForecastNodeImpl);
