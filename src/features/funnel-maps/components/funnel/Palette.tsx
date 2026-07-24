import { useMemo, useState, type DragEvent } from 'react';
import { Search, StickyNote, Image as ImageIcon, LineChart, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ElementIcon } from './ElementIcon';
import {
  ELEMENT_LIBRARY,
  TRAFFIC_GROUPS,
  TRAFFIC_GROUP_ORDER,
  type ElementVariant,
  type FunnelNodeCategory,
} from '../../types/funnel';

export type DragPayload =
  | { type: 'funnelNode' | 'pageNode'; category: FunnelNodeCategory; variantId: string }
  | { type: 'noteNode' }
  | { type: 'imageNode' }
  | { type: 'forecastNode' };

const TABS: { id: FunnelNodeCategory; label: string }[] = [
  { id: 'traffic', label: 'Fontes' },
  { id: 'page', label: 'Páginas' },
  { id: 'action', label: 'Ações' },
  { id: 'offline', label: 'Offline' },
];

function payloadFor(category: FunnelNodeCategory, variantId: string): DragPayload {
  return { type: category === 'page' ? 'pageNode' : 'funnelNode', category, variantId };
}

interface PaletteProps {
  onDragStart: (event: DragEvent, payload: DragPayload) => void;
}

/** Collapsible element panel dressed in the same liquid-glass material as
 *  the rest of the CRM: search, a pill-segmented tab row and a sectioned
 *  icon grid, with a dashed "Personalizado" tile on every tab that drops a
 *  fully editable card (all metrics available) onto the canvas. */
export function Palette({ onDragStart }: PaletteProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<FunnelNodeCategory>('traffic');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => ELEMENT_LIBRARY[tab].filter((v) => v.id !== 'custom' && v.label.toLowerCase().includes(q)),
    [tab, q],
  );

  const trafficGroups = useMemo(() => {
    if (tab !== 'traffic') return null;
    return TRAFFIC_GROUP_ORDER.map((group) => ({
      group,
      items: TRAFFIC_GROUPS[group]
        .filter((id) => id !== 'custom')
        .map((id) => ELEMENT_LIBRARY.traffic.find((v) => v.id === id))
        .filter((v): v is ElementVariant => !!v && v.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [tab, q]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Mostrar elementos"
        className="flex w-9 shrink-0 flex-col items-center border-r border-white/5 pt-3 text-white/40 hover:text-white"
      >
        <PanelLeftOpen size={16} />
      </button>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-white/5 text-white">
      {/* Search + collapse */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
          <Search size={13} className="shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Recolher painel"
          className="shrink-0 text-white/40 hover:text-white"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Pill-segmented tabs */}
      <div className="flex gap-1 border-b border-white/5 p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-1 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pb-8 pt-3">
        {trafficGroups ? (
          trafficGroups.map(({ group, items }) => (
            <Section key={group} title={group}>
              <Grid category={tab} items={items} onDragStart={onDragStart} />
            </Section>
          ))
        ) : (
          <Grid category={tab} items={filtered} onDragStart={onDragStart} />
        )}

        {/* Custom card */}
        <Section title="Personalizado">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, payloadFor(tab, 'custom'))}
            title="Card personalizado com todas as métricas"
            className="flex w-16 cursor-grab flex-col items-center gap-1 rounded-lg p-1 hover:bg-white/5 active:cursor-grabbing"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-white/40">
              <Plus size={18} />
            </span>
            <span className="w-full truncate text-center text-[9px] leading-tight text-white/50">Criar</span>
          </div>
        </Section>

        {/* Tools */}
        <Section title="Ferramentas">
          <div className="flex flex-wrap gap-1.5">
            <ToolChip icon={StickyNote} label="Nota" className="border-amber-400/30 bg-amber-300/10 text-amber-300" onDragStart={(e) => onDragStart(e, { type: 'noteNode' })} />
            <ToolChip icon={ImageIcon} label="Imagem" className="border-white/10 bg-white/[0.03] text-white/70" onDragStart={(e) => onDragStart(e, { type: 'imageNode' })} />
            <ToolChip icon={LineChart} label="Forecast" className="border-porceli-purpleLight/30 bg-porceli-purple/10 text-porceli-purpleLight" onDragStart={(e) => onDragStart(e, { type: 'forecastNode' })} />
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 border-b border-white/5 pb-1 text-[11px] font-semibold text-white/40">{title}</p>
      {children}
    </div>
  );
}

function Grid({
  category,
  items,
  onDragStart,
}: {
  category: FunnelNodeCategory;
  items: ElementVariant[];
  onDragStart: (event: DragEvent, payload: DragPayload) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-2">
      {items.map((variant) => (
        <div
          key={variant.id}
          draggable
          onDragStart={(e) => onDragStart(e, payloadFor(category, variant.id))}
          title={variant.label}
          className="flex w-16 cursor-grab flex-col items-center gap-1 rounded-lg p-1 hover:bg-white/5 active:cursor-grabbing"
        >
          <ElementIcon category={category} variant={variant} size={44} />
          <span className="w-full truncate text-center text-[9px] leading-tight text-white/50">{variant.label}</span>
        </div>
      ))}
    </div>
  );
}

function ToolChip({
  icon: Icon,
  label,
  className,
  onDragStart,
}: {
  icon: typeof StickyNote;
  label: string;
  className: string;
  onDragStart: (event: DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex cursor-grab items-center gap-1 rounded-lg border px-2 py-1.5 active:cursor-grabbing ${className}`}
    >
      <Icon size={13} /> <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}
