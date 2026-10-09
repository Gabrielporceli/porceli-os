import { Trash } from 'iconsax-react';
import type { FunnelNodeCategory, FunnelNodeData } from '../../../types/funnel';
import { isPreviewDisabled } from '../../../lib/pagePreview';
import { isLeadStep } from '../../../lib/leadStep';
import { visitorBounds, visitorsFor, withScenarioValue, type Scenario } from '../../../lib/scenarios';
import { useFunnelActions } from '../funnelContext';

interface NodeFieldsProps {
  id: string;
  data: FunnelNodeData;
  scenario: Scenario;
  isPage: boolean;
  hasRevenue: boolean;
}

const inputBase =
  'nodrag nopan rounded-lg bg-black/[0.06] px-2 py-1 text-[11px] text-[#2F2D2E] outline-none transition-colors placeholder:text-[#2F2D2E]/35 focus:bg-black/10';

/** Campos de edição que aparecem DENTRO do card quando ele está selecionado.
 *  Substitui o antigo painel lateral: tudo é editado no próprio card. Em
 *  repouso o card fica enxuto; selecionar abre estes campos embaixo. */
export function NodeFields({ id, data, scenario, isPage, hasRevenue }: NodeFieldsProps) {
  const { updateNodeData, deleteNode } = useFunnelActions();
  const category = data.category as FunnelNodeCategory;
  const set = (patch: Record<string, unknown>) => updateNodeData(id, patch);

  return (
    <div className="nodrag nopan space-y-1.5">
      {isPage && (
        <input
          value={data.url ?? ''}
          placeholder="URL da página (https://…)"
          onChange={(e) => set({ url: e.target.value })}
          className={`${inputBase} w-full`}
        />
      )}
      {isPage && (
        <label className="flex cursor-pointer items-center justify-between gap-2 text-[10px] text-[#2F2D2E]/60">
          <span>Sem preview (área logada)</span>
          <input
            type="checkbox"
            checked={isPreviewDisabled(data)}
            onChange={(e) => set({ noPreview: e.target.checked })}
            className="h-3 w-3 accent-porceli-purple"
          />
        </label>
      )}

      {category === 'traffic' && (
        <NumberRow
          label={`Visitas / mês · ${scenario === 'low' ? 'pessimista' : scenario === 'high' ? 'otimista' : scenario === 'real' ? 'real' : 'médio'}`}
          title={scenario === 'mid' ? 'Cenário médio: editar aqui move o pessimista e o otimista juntos' : undefined}
          value={Math.round(visitorsFor(data, scenario))}
          onChange={(v) => {
            if (scenario === 'real') {
              set({ visitorsReal: v });
              return;
            }
            const b = visitorBounds(data);
            const next = withScenarioValue(b.low, b.high, scenario, v);
            set({ visitorsLow: next.low, visitorsHigh: next.high });
          }}
        />
      )}
      <NumberRow
        label={scenario === 'real' ? 'Investimento · real' : 'Investimento'}
        prefix="R$"
        value={scenario === 'real' ? (data.costReal ?? data.cost) : data.cost}
        onChange={(v) => set(scenario === 'real' ? { costReal: v } : { cost: v })}
      />
      {category !== 'traffic' && (
        <NumberRow
          label={scenario === 'real' ? 'Ticket médio · real' : 'Ticket médio'}
          prefix="R$"
          title="Com ticket preenchido, este passo conta como conversão e gera receita"
          value={scenario === 'real' ? (data.avgTicketReal ?? data.avgTicket) : data.avgTicket}
          onChange={(v) => set(scenario === 'real' ? { avgTicketReal: v } : { avgTicket: v })}
        />
      )}
      {category !== 'traffic' && (data.avgTicket ?? 0) === 0 && (
        <label className="flex cursor-pointer items-center justify-between gap-2 text-[10px] text-[#2F2D2E]/60" title="O custo por lead (gasto até aqui ÷ leads) aparece no primeiro passo de lead do fluxo">
          <span>Este passo é o lead</span>
          <input
            type="checkbox"
            checked={isLeadStep(data)}
            onChange={(e) => set({ isLead: e.target.checked })}
            className="h-3 w-3 accent-porceli-purple"
          />
        </label>
      )}
      {category !== 'traffic' && (data.avgTicket ?? 0) > 0 && (
        <NumberRow
          label="Margem de lucro"
          suffix="%"
          title="Parte do ticket que sobra depois dos custos de entregar. Vazio = 100%"
          value={data.margin}
          onChange={(v) => set({ margin: Math.min(100, v) })}
        />
      )}

      <textarea
        value={data.notes ?? ''}
        placeholder="Anotações…"
        onChange={(e) => set({ notes: e.target.value })}
        rows={2}
        className={`${inputBase} w-full resize-none`}
      />

      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        <span className="mr-0.5 text-[9px] font-black uppercase tracking-widest text-[#2F2D2E]/50">Mostrar</span>
        <Chip label="Pessoas" active={data.showPeople ?? true} onClick={() => set({ showPeople: !(data.showPeople ?? true) })} />
        <Chip label="Gasto" active={data.showCost ?? true} onClick={() => set({ showCost: !(data.showCost ?? true) })} />
        {hasRevenue && (
          <Chip label="Receita" active={data.showRevenue ?? true} onClick={() => set({ showRevenue: !(data.showRevenue ?? true) })} />
        )}
      </div>

      <button
        type="button"
        onClick={() => deleteNode(id)}
        className="nodrag nopan flex items-center gap-1 pt-0.5 text-[10px] font-medium text-[#2F2D2E]/50 transition-colors hover:text-red-600"
      >
        <Trash size={11} /> Remover
      </button>
    </div>
  );
}

function NumberRow({
  label, prefix, suffix, title, readOnly, value, onChange,
}: {
  label: string; prefix?: string; suffix?: string; title?: string; readOnly?: boolean; value?: number; onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2" title={title}>
      <span className="text-[10px] text-[#2F2D2E]/60">{label}</span>
      <span className="flex items-center gap-1">
        {prefix && <span className="text-[10px] text-[#2F2D2E]/50">{prefix}</span>}
        <input
          type="number"
          min={0}
          value={value ? value : ''}
          placeholder="0"
          readOnly={readOnly}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputBase} w-[64px] text-right tabular-nums ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
        {suffix && <span className="text-[10px] text-[#2F2D2E]/50">{suffix}</span>}
      </span>
    </label>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nodrag nopan rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
        active ? 'bg-[#2F2D2E] text-white' : 'bg-black/[0.06] text-[#2F2D2E]/50 hover:text-[#2F2D2E]'
      }`}
    >
      {label}
    </button>
  );
}
