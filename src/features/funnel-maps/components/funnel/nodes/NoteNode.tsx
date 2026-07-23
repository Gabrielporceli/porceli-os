import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { StickyNote, X } from 'lucide-react';
import type { NoteNodeData } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';

type NoteNodeProps = NodeProps & { data: NoteNodeData };

function NoteNodeImpl({ id, data }: NoteNodeProps) {
  const { updateNodeData, deleteNode } = useFunnelActions();

  return (
    <div className="group flex h-40 w-56 flex-col rounded-lg border border-amber-400/30 bg-amber-300/10 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-amber-400/20 px-2 py-1.5">
        <StickyNote size={13} className="text-amber-400" />
        <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-amber-400/80">Nota</span>
        <button
          type="button"
          onClick={() => deleteNode(id)}
          className="text-amber-400/60 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          title="Remover"
        >
          <X size={13} />
        </button>
      </div>
      <textarea
        value={data.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Escreva uma anotação…"
        className="nodrag nopan flex-1 resize-none bg-transparent p-2.5 text-xs text-amber-50 outline-none placeholder:text-amber-200/40"
      />
    </div>
  );
}

export const NoteNode = memo(NoteNodeImpl);
