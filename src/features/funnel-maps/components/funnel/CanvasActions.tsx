import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter,
  Copy, Grid3x3, LayoutDashboard, Redo2, Undo2,
} from 'lucide-react';
import { PillTabs } from '@/components/ui/pill-tabs';
import type { AlignMode } from '../../lib/funnelAlign';
import { SCENARIOS, type Scenario } from '../../lib/scenarios';

interface CanvasActionsProps {
  canUndo: boolean;
  canRedo: boolean;
  snap: boolean;
  hasSelection: boolean;
  /** Dois ou mais cards selecionados: mostra os botões de alinhar. */
  showAlign: boolean;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  onAlign: (mode: AlignMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onArrange: () => void;
  onDuplicate: () => void;
  onToggleSnap: () => void;
}

/** Barra flutuante do canvas: desfazer/refazer, duplicar, arrumar em colunas
 *  e ligar/desligar o encaixe na grade. Os atalhos (Ctrl+Z, Ctrl+Shift+Z,
 *  Ctrl+D, Ctrl+C/V) estão no próprio canvas. */
export function CanvasActions({
  canUndo, canRedo, snap, hasSelection, showAlign, scenario, onScenario, onAlign, onUndo, onRedo, onArrange, onDuplicate, onToggleSnap,
}: CanvasActionsProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
    {/* Mesmas abas em pílula do resto do sistema (regra 4): a pílula de vidro
        desliza de um cenário para o outro, sem cor própria por cenário. */}
    <div className="nodrag nopan liquid-glass rounded-full p-0.5" aria-label="Cenário da projeção">
      <PillTabs
        items={SCENARIOS.map((s) => ({
          value: s.id,
          label: <span title={DICA_CENARIO[s.id] ?? `Edite as taxas e visitas do cenário ${s.label.toLowerCase()}`}>{s.label}</span>,
        }))}
        value={scenario}
        onChange={(v) => onScenario(v as Scenario)}
        className="flex-nowrap whitespace-nowrap bg-transparent"
      />
    </div>
    <div className={BARRA}>
      <Btn title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={14} />
      </Btn>
      <Btn title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={14} />
      </Btn>
      <span className="mx-1 h-4 w-px bg-white/10" />
      <Btn title="Duplicar selecionados (Ctrl+D)" disabled={!hasSelection} onClick={onDuplicate}>
        <Copy size={14} />
      </Btn>
      <Btn title="Arrumar em colunas" onClick={onArrange}>
        <LayoutDashboard size={14} />
      </Btn>
      <Btn title={snap ? 'Encaixe na grade: ligado' : 'Encaixe na grade: desligado'} active={snap} onClick={onToggleSnap}>
        <Grid3x3 size={14} />
      </Btn>
    </div>

    {showAlign && (
      <div className={BARRA}>
        <Btn title="Alinhar à esquerda" onClick={() => onAlign('left')}><AlignStartVertical size={14} /></Btn>
        <Btn title="Centralizar na horizontal" onClick={() => onAlign('hcenter')}><AlignCenterVertical size={14} /></Btn>
        <Btn title="Alinhar à direita" onClick={() => onAlign('right')}><AlignEndVertical size={14} /></Btn>
        <span className="mx-0.5 h-4 w-px bg-white/10" />
        <Btn title="Alinhar ao topo" onClick={() => onAlign('top')}><AlignStartHorizontal size={14} /></Btn>
        <Btn title="Centralizar na vertical" onClick={() => onAlign('vcenter')}><AlignCenterHorizontal size={14} /></Btn>
        <Btn title="Alinhar à base" onClick={() => onAlign('bottom')}><AlignEndHorizontal size={14} /></Btn>
        <span className="mx-0.5 h-4 w-px bg-white/10" />
        <Btn title="Distribuir na horizontal (3 ou mais)" onClick={() => onAlign('distribute-h')}><AlignHorizontalDistributeCenter size={14} /></Btn>
        <Btn title="Distribuir na vertical (3 ou mais)" onClick={() => onAlign('distribute-v')}><AlignVerticalDistributeCenter size={14} /></Btn>
      </div>
    )}
    </div>
  );
}

const DICA_CENARIO: Partial<Record<Scenario, string>> = {
  mid: 'Média entre o pessimista e o otimista. Editar aqui move os dois juntos',
  real: 'Dados reais: taxas, visitas, investimento e ticket do que aconteceu. Onde não houver dado real, vale o médio',
};

/** Barra de botões flutuante: pílula de vidro, sem borda (padrão das superfícies). */
const BARRA = 'nodrag nopan liquid-glass flex items-center gap-0.5 rounded-full p-1';

function Btn({
  title, disabled, active, onClick, children,
}: { title: string; disabled?: boolean; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100 ${
        active ? 'bg-white/[0.13] text-white' : 'text-white/65 hover:bg-white/[0.11] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
