import type { Node } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { CATEGORY_DEFS, findVariant, type FunnelNodeCategory, type FunnelNodeComputed, type FunnelNodeData } from '../../types/funnel';
import { formatCurrency, formatNumber } from '../../lib/format';
import { MetricToggles } from './nodes/MetricToggles';

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

/** Fixed right-hand settings panel for the selected element, dressed in the
 *  same liquid-glass material as the rest of the CRM. Replaces the old
 *  floating toolbar that opened on top of the canvas and hid the map — all
 *  editing now happens here without covering anything. */
export function PropertiesPanel({ node, onUpdate, onDelete }: PropertiesPanelProps) {
  const data = node.data as FunnelNodeData & { computed?: FunnelNodeComputed };
  const category = data.category as FunnelNodeCategory;
  const def = CATEGORY_DEFS[category];
  const variant = findVariant(category, data.variant);
  const computed = data.computed;

  return (
    <aside className="scrollbar-hide flex w-72 shrink-0 flex-col overflow-y-auto border-l border-white/5 text-white">
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: def.color }}>
          {def.label}
        </p>
        <p className="text-sm font-semibold text-white">{data.label || variant.label}</p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 text-xs">
        <Field label="Nome">
          <input
            value={data.label}
            placeholder={variant.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-white outline-none transition-colors placeholder:text-white/30 focus:bg-white/[0.06]"
          />
        </Field>

        {node.type === 'pageNode' && (
          <Field label="URL da página">
            <input
              value={data.url ?? ''}
              placeholder="https://…"
              onChange={(e) => onUpdate(node.id, { url: e.target.value })}
              className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-white outline-none transition-colors placeholder:text-white/30 focus:bg-white/[0.06]"
            />
          </Field>
        )}

        {category === 'traffic' && (
          <Field label="Visitas / mês">
            <input
              type="number"
              min={0}
              value={data.visitors ?? 0}
              onChange={(e) => onUpdate(node.id, { visitors: Number(e.target.value) })}
              className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-right text-white outline-none transition-colors focus:bg-white/[0.06]"
            />
          </Field>
        )}

        <Field label="Investimento (R$)">
          <input
            type="number"
            min={0}
            value={data.cost ?? 0}
            onChange={(e) => onUpdate(node.id, { cost: Number(e.target.value) })}
            className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-right text-white outline-none transition-colors focus:bg-white/[0.06]"
          />
        </Field>

        {category !== 'traffic' && (
          <Field label="Ticket médio (R$) — marca este passo como conversão">
            <input
              type="number"
              min={0}
              value={data.avgTicket ?? 0}
              onChange={(e) => onUpdate(node.id, { avgTicket: Number(e.target.value) })}
              className="w-full rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-right text-white outline-none transition-colors focus:bg-white/[0.06]"
            />
          </Field>
        )}

        <Field label="Anotações">
          <textarea
            value={data.notes ?? ''}
            placeholder="Observações sobre este passo…"
            onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-white outline-none transition-colors placeholder:text-white/30 focus:bg-white/[0.06]"
          />
        </Field>

        <MetricToggles
          showPeople={data.showPeople ?? true}
          showCost={data.showCost ?? true}
          showRevenue={data.showRevenue ?? true}
          hasRevenue={computed?.revenue !== undefined}
          onToggle={(patch) => onUpdate(node.id, patch)}
        />

        {/* Computed summary */}
        <div className="liquid-glass rounded-xl p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">Resultado simulado</p>
          <Stat label="Pessoas" value={formatNumber(computed?.people ?? 0)} />
          {computed?.costPerPerson !== undefined && (
            <Stat
              label={category === 'traffic' ? 'Custo / visita' : 'Custo / lead'}
              value={formatCurrency(computed.costPerPerson)}
            />
          )}
          {computed?.revenue !== undefined && (
            <>
              <Stat label="Receita" value={formatCurrency(computed.revenue)} accent="text-emerald-400" />
              {(data.cost ?? 0) > 0 && (
                <Stat
                  label="Retorno (receita/gasto)"
                  value={`${(computed.revenue / (data.cost ?? 1)).toFixed(2)}x`}
                  accent="text-porceli-purpleLight"
                />
              )}
            </>
          )}
        </div>

        <LiquidGlassButton tint="danger" onClick={() => onDelete(node.id)} className="h-9 text-xs font-medium text-red-300">
          <Trash2 size={13} /> Remover elemento
        </LiquidGlassButton>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-white/50">
      <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
