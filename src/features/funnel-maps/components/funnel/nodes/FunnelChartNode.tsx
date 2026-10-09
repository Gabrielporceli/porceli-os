import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import type { FunnelChartData, FunnelStage } from '../../../lib/funnelChart';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { SCENARIOS, type Scenario } from '../../../lib/scenarios';
import { useFunnelActions } from '../funnelContext';

type FunnelChartProps = NodeProps & { data: { chart?: FunnelChartData; scenario?: Scenario } };

// Do roxo claro ao escuro: cada etapa um tom mais fundo, como o funil do Dashboard.
const SHADES = ['#8B5CF6', '#7C4DE0', '#6829C0', '#5A22A8', '#4A1D8F', '#3D1877'];

const pct = (v: number) => `${v >= 10 ? Math.round(v * 100) : Math.round(v * 1000) / 10}%`;

function FunnelChartNodeImpl({ id, data }: FunnelChartProps) {
  const { deleteNode } = useFunnelActions();
  const stages = data.chart?.stages ?? [];
  const totalSales = data.chart?.totalSales;
  const scenarioLabel = SCENARIOS.find((s) => s.id === data.scenario)?.label ?? 'Médio';
  const max = Math.max(1, ...stages.map((s) => s.people));
  // Largura de cada etapa (em % da área do funil); nunca some de vez.
  const width = (s: FunnelStage) => Math.max(14, (s.people / max) * 100);

  return (
    <div className="group w-[24rem] cursor-grab select-none rounded-2xl border border-black/10 bg-[#F4F4F4] p-4 text-[#2F2D2E] shadow-lg shadow-black/40">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-[#2F2D2E]/50">Funil</span>
        <span className="rounded-md bg-[#6829C0] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
          {scenarioLabel}
        </span>
        <button
          type="button"
          onClick={() => deleteNode(id)}
          title="Remover"
          className="nodrag nopan text-[#2F2D2E]/40 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
        >
          <X size={13} />
        </button>
      </div>

      {stages.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#2F2D2E]/50">Adicione e ligue cards no mapa para ver o funil.</p>
      ) : (
        <div className="space-y-0.5">
          {stages.map((s, i) => {
            const top = width(s);
            const bottom = i < stages.length - 1 ? width(stages[i + 1]) : Math.max(8, top * 0.8);
            const clip = `polygon(${(100 - top) / 2}% 0, ${(100 + top) / 2}% 0, ${(100 + bottom) / 2}% 100%, ${(100 - bottom) / 2}% 100%)`;
            return (
              <div key={i} className="grid grid-cols-[9.5rem_1fr] items-center gap-3">
                <div className="h-11" style={{ clipPath: clip, background: SHADES[Math.min(i, SHADES.length - 1)] }} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold" title={s.names.join(' + ')}>
                    {s.names.join(' + ')}
                  </p>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black tabular-nums tracking-tight">{formatNumber(s.people)}</span>
                    {i > 0 && (
                      <span className="text-[10px] text-[#2F2D2E]/55">
                        {s.fromPrevious !== undefined ? `${pct(s.fromPrevious)} da etapa anterior` : ''}
                      </span>
                    )}
                  </p>
                  {s.revenue > 0 && (
                    <p className="text-[10px] font-black text-green-600">{formatCurrency(s.revenue)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stages.length > 1 && stages[0].people > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.08] pt-2.5 text-[10px]">
          <span className="font-black uppercase tracking-widest text-[#2F2D2E]/50">
            {totalSales !== undefined ? 'Visitas → vendas' : 'Do topo ao fim'}
          </span>
          <span>
            <span className="text-[#2F2D2E]/55">
              {formatNumber(stages[stages.length - 1].people)} de {formatNumber(stages[0].people)} ·{' '}
            </span>
            <span className="text-xs font-black tabular-nums">{pct(stages[stages.length - 1].shareOfTop)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export const FunnelChartNode = memo(FunnelChartNodeImpl);
