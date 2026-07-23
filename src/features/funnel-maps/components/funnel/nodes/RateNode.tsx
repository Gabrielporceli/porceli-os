import { memo } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { Spline, Minus, MoreHorizontal, X } from 'lucide-react';
import type { RateNodeData, FunnelNodeComputed } from '../../../types/funnel';
import { formatNumber } from '../../../lib/format';
import { useFunnelActions } from '../funnelContext';

type RateNodeProps = NodeProps & { data: RateNodeData & { computed?: FunnelNodeComputed } };

function RateNodeImpl({ id, data, selected }: RateNodeProps) {
  const { updateNodeData, deleteNode, updateEdgeStyleForNode } = useFunnelActions();
  const curve = data.curve ?? 'bezier';
  const dashed = data.dashed ?? false;
  const people = data.computed?.people ?? 0;

  const setStyle = (patch: { curve?: 'bezier' | 'straight'; dashed?: boolean }) => {
    updateNodeData(id, patch);
    updateEdgeStyleForNode(id, patch);
  };

  return (
    <div className="group relative">
      <NodeToolbar position={Position.Top} isVisible={selected} className="nodrag nopan mb-1" offset={6}>
        <div className="flex overflow-hidden rounded-md border border-porceli-gray-700 bg-porceli-gray-900 shadow-lg">
          <ToolButton active={curve === 'bezier'} title="Linha curva" onClick={() => setStyle({ curve: 'bezier' })}>
            <Spline size={13} />
          </ToolButton>
          <ToolButton active={curve === 'straight'} title="Linha reta" onClick={() => setStyle({ curve: 'straight' })}>
            <Minus size={13} />
          </ToolButton>
          <span className="w-px bg-porceli-gray-700" />
          <ToolButton active={!dashed} title="Sólida" onClick={() => setStyle({ dashed: false })}>
            <Minus size={13} strokeWidth={3} />
          </ToolButton>
          <ToolButton active={dashed} title="Tracejada (indireto)" onClick={() => setStyle({ dashed: true })}>
            <MoreHorizontal size={13} />
          </ToolButton>
          <span className="w-px bg-porceli-gray-700" />
          <ToolButton title="Remover conexão" onClick={() => deleteNode(id)}>
            <X size={13} />
          </ToolButton>
        </div>
      </NodeToolbar>

      <Handle
        type="target"
        position={Position.Left}
        className={`!h-2.5 !w-2.5 !border-2 !border-white !bg-porceli-gray-400 !transition-opacity group-hover:!opacity-100 ${selected ? '!opacity-100' : '!opacity-0'}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-400 !transition-opacity group-hover:!opacity-100 ${selected ? '!opacity-100' : '!opacity-0'}`}
      />

      <div
        className={`flex cursor-move overflow-hidden rounded-md border bg-white shadow-md ${
          selected ? 'border-porceli-purpleLight ring-2 ring-porceli-purpleLight/40' : 'border-black/5'
        }`}
      >
        <label className="flex min-w-[52px] flex-col items-center px-2.5 py-1.5">
          <span className="text-[8px] font-semibold uppercase tracking-wide text-porceli-gray-400">Taxa</span>
          <span className="nodrag flex items-baseline justify-center text-sm font-bold text-amber-500">
            <input
              type="number"
              min={0}
              max={100}
              value={data.rate ?? 100}
              onChange={(e) => updateNodeData(id, { rate: Number(e.target.value) })}
              className="w-8 bg-transparent text-right tabular-nums outline-none"
            />
            <span className="text-[10px]">%</span>
          </span>
        </label>
        <div className="flex min-w-[52px] flex-col items-center border-l border-porceli-gray-100 px-2.5 py-1.5">
          <span className="text-[8px] font-semibold uppercase tracking-wide text-porceli-gray-400">Pessoas</span>
          <span className="text-sm font-bold tabular-nums text-porceli-gray-900">{formatNumber(people)}</span>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ active, title, onClick, children }: { active?: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 w-7 items-center justify-center transition-colors ${
        active ? 'bg-porceli-purple text-white' : 'text-porceli-gray-400 hover:bg-porceli-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

export const RateNode = memo(RateNodeImpl);
