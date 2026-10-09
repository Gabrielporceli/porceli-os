import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { Chart, DollarCircle, Gps, PercentageSquare, Profile2User, TrendUp, UserTick, Wallet } from 'iconsax-react';
import type { ForecastSummary } from '../../../lib/funnelMath';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { useFunnelActions } from '../funnelContext';
import { SCENARIOS, type Scenario } from '../../../lib/scenarios';

type ForecastNodeProps = NodeProps & {
  data: { computed?: ForecastSummary; scenario?: Scenario; scenarios?: Record<Scenario, ForecastSummary> };
};

function ForecastNodeImpl({ id, data }: ForecastNodeProps) {
  const { deleteNode } = useFunnelActions();
  const s = data.computed ?? { people: 0, leads: 0, revenue: 0, expenses: 0, profit: 0, cpl: null, roi: null };

  return (
    <div className="group w-[26rem] cursor-grab select-none overflow-hidden rounded-2xl border border-white/15 bg-[#6829C0] shadow-lg shadow-black/40">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <Chart size={14} className="text-white/70" />
        <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-white/60">Forecast</span>
        <button
          type="button"
          onClick={() => deleteNode(id)}
          className="nodrag nopan text-white/50 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          title="Remover"
        >
          <X size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <Stat icon={Profile2User} color="#0ea5e9" label="Pessoas" value={formatNumber(s.people)} />
        <Stat icon={UserTick} color="#f59e0b" label="Leads / Conversões" value={formatNumber(s.leads)} />
        <Stat icon={DollarCircle} color="#22c55e" label="Receita" value={formatCurrency(s.revenue)} />
        <Stat icon={Wallet} color="#ef4444" label="Investimento" value={formatCurrency(s.expenses)} />
        <Stat icon={Gps} color="#0ea5e9" label="Custo / lead" value={s.cpl === null ? '—' : formatCurrency(s.cpl)} />
        <Stat icon={TrendUp} color="#6829c0" label="Lucro" value={formatCurrency(s.profit)} />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-white/60">
          <PercentageSquare size={12} /> Retorno sobre investimento
        </span>
        <span className="text-sm font-black tabular-nums text-white">{s.roi === null ? '—' : `${s.roi.toFixed(2)}x`}</span>
      </div>
      {data.scenarios && (
        <div className="border-t border-white/10 px-4 py-2.5">
          <div className="grid grid-cols-[0.9fr_repeat(4,minmax(0,1fr))] gap-x-2 gap-y-1 text-[10px]">
            <span />
            {SCENARIOS.map((sc) => (
              <span
                key={sc.id}
                className={`text-right font-semibold ${data.scenario === sc.id ? 'text-white' : 'text-white/45'}`}
              >
                {sc.label}
              </span>
            ))}
            <Row label="Leads" values={SCENARIOS.map((sc) => formatNumber(data.scenarios![sc.id].leads))} />
            <Row label="Receita" values={SCENARIOS.map((sc) => formatCurrency(data.scenarios![sc.id].revenue))} />
            <Row label="Lucro" values={SCENARIOS.map((sc) => formatCurrency(data.scenarios![sc.id].profit))} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <>
      <span className="text-white/55">{label}</span>
      {values.map((v, i) => (
        <span key={i} className="truncate text-right font-bold tabular-nums text-white">
          {v}
        </span>
      ))}
    </>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Profile2User;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-[#4a1d8f] p-3.5">
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50">
        <Icon size={12} color={color} /> {label}
      </span>
      <span className="text-base font-black tabular-nums tracking-tight text-white">{value}</span>
    </div>
  );
}

export const ForecastNode = memo(ForecastNodeImpl);
