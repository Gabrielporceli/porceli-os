import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter,
  Copy, Grid3x3, LayoutDashboard, Redo2, Undo2,
} from 'lucide-react';
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
    <div className="nodrag nopan flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1c1c20]/90 p-1 shadow-lg" role="tablist" aria-label="Cenário da projeção">
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={scenario === s.id}
          onClick={() => onScenario(s.id)}
          title={
            s.id === 'mid'
              ? 'Média entre o pessimista e o otimista. Editar aqui move os dois juntos'
              : s.id === 'real'
                ? 'Dados reais: taxas, visitas, investimento e ticket do que aconteceu. Onde não houver dado real, vale o médio'
                : `Edite as taxas e visitas do cenário ${s.label.toLowerCase()}`
          }
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            scenario === s.id
              ? s.id === 'low'
                ? 'bg-red-500/20 text-red-300'
                : s.id === 'high'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : s.id === 'real'
                    ? 'bg-[#6829C0] text-white'
                    : 'bg-white/15 text-white'
              : 'text-white/45 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
    <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1c1c20]/90 p-1 shadow-lg">
      <Btn title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={14} />
      </Btn>
      <Btn title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={14} />
      </Btn>
      <span className="mx-0.5 h-4 w-px bg-white/10" />
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
      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1c1c20]/90 p-1 shadow-lg">
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
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
