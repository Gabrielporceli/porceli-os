import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { Bezier, Minus, More } from 'iconsax-react';
import { X } from 'lucide-react';
import { useFunnelActions } from '../funnelContext';

interface PathEdgeData {
  curve?: 'bezier' | 'straight';
  dashed?: boolean;
  rate?: number;
  [key: string]: unknown;
}

/** Conexão entre dois cards. Sai sempre do ponto de saída (direita) de um card
 *  e entra no ponto de entrada (esquerda) do próximo. A taxa fica anexada ao
 *  card de destino (ver NodeIncoming), não na linha.
 *
 *  Clicar na linha a seleciona e abre, no meio dela, uma barrinha com o estilo
 *  (curva/reta, sólida/tracejada) e o X que remove SÓ a conexão. A área
 *  clicável é bem maior que o traço de 2px. */
export function PathEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected } = props;
  const data = props.data as PathEdgeData | undefined;
  const { deleteConnection, updateEdgeData } = useFunnelActions();

  const curve = data?.curve ?? 'bezier';
  const dashed = data?.dashed ?? false;
  const rate = data?.rate ?? 100;
  const pathArgs = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [edgePath, labelX, labelY] = curve === 'straight' ? getStraightPath(pathArgs) : getBezierPath(pathArgs);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={28}
        style={{
          ...style,
          stroke: selected ? '#8B5CF6' : 'rgba(139, 92, 246, 0.6)',
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: dashed ? '6 5' : undefined,
        }}
      />
      {!selected && rate < 100 && (
        <EdgeLabelRenderer>
          <span
            className="nodrag nopan pointer-events-none absolute rounded-full bg-[#6829c0] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {rate}%
          </span>
        </EdgeLabelRenderer>
      )}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute flex overflow-hidden rounded-xl border border-white/10 bg-[#2F2D2E] shadow-lg"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <Tool active={curve === 'bezier'} title="Linha curva" onClick={() => updateEdgeData(id, { curve: 'bezier' })}>
              <Bezier size={13} />
            </Tool>
            <Tool active={curve === 'straight'} title="Linha reta" onClick={() => updateEdgeData(id, { curve: 'straight' })}>
              <Minus size={13} />
            </Tool>
            <span className="w-px bg-white/10" />
            <Tool active={!dashed} title="Sólida" onClick={() => updateEdgeData(id, { dashed: false })}>
              <Minus size={13} strokeWidth={3} />
            </Tool>
            <Tool active={dashed} title="Tracejada (indireto)" onClick={() => updateEdgeData(id, { dashed: true })}>
              <More size={13} />
            </Tool>
            <span className="w-px bg-white/10" />
            <Tool title="Remover conexão" danger onClick={() => deleteConnection(id)}>
              <X size={13} />
            </Tool>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function Tool({
  active, danger, title, onClick, children,
}: { active?: boolean; danger?: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 w-7 items-center justify-center transition-colors ${
        active
          ? 'bg-[#6829c0] text-white'
          : danger
            ? 'text-white/60 hover:bg-red-500 hover:text-white'
            : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
