import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  Handle,
  NodeToolbar,
  Position,
  type Edge,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
  OrbAvatar,
  defaultOrbColor,
  type AvatarColor,
  type AvatarShape,
  type OrbEyewear,
  type OrbExtra,
  type OrbHat,
} from "./orb-avatar";

export type AgentStatus = "ativo" | "parado" | "erro";

/** Dados mínimos de um agente para desenhá-lo no canvas. */
export interface CanvasAgent {
  id: string;
  nome: string;
  papel: string;
  status: AgentStatus;
  cor?: AvatarColor;
  forma?: AvatarShape;
  piscando?: boolean;
  chapeu?: OrbHat;
  corChapeu?: string;
  oculos?: OrbEyewear;
  extras?: OrbExtra[];
  /** Agente que coordena os demais. */
  principal?: boolean;
}

const STATUS_STYLE: Record<AgentStatus, string> = {
  ativo: "bg-emerald-400/15 text-emerald-300",
  parado: "bg-white/10 text-white/50",
  erro: "bg-red-400/15 text-red-300",
};

type AgentNodeData = { agent: CanvasAgent; selected: boolean };

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const { agent: a, selected } = data;
  return (
    <div className="flex w-36 cursor-grab flex-col items-center gap-2 pt-6 active:cursor-grabbing">
      <div className={cn("relative rounded-full p-1.5 transition-shadow", selected && "ring-2 ring-white/40")}>
        {/* Pontas das linhas no centro do orbe (invisíveis). */}
        <Handle type="target" position={Position.Top} className="!pointer-events-none !h-0 !w-0 !border-0 !bg-transparent !top-1/2 !left-1/2" />
        <Handle type="source" position={Position.Top} className="!pointer-events-none !h-0 !w-0 !border-0 !bg-transparent !top-1/2 !left-1/2" />
        {a.principal && (
          <span className="absolute -right-2 -top-1 z-10 rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
            Principal
          </span>
        )}
        <OrbAvatar
          size="lg"
          color={a.cor ?? defaultOrbColor(a.id)}
          shape={a.forma}
          blinking={a.piscando ?? true}
          hat={a.chapeu}
          hatColor={a.corChapeu}
          eyewear={a.oculos}
          extras={a.extras}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white">{a.nome}</p>
        <p className="line-clamp-1 text-[11px] text-white/40">{a.papel}</p>
      </div>
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[a.status])}>
        {a.status}
      </span>
    </div>
  );
}

// Tamanho conhecido de saída: o fitView não depende de medir o DOM.
const NODE_W = 144;
const NODE_H = 190;

const nodeTypes: NodeTypes = { agent: AgentNode };

const storageKey = (id: string) => `agents-canvas:pos:${id}`;

function loadPos(id: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Posição inicial: grade de até 4 por linha; a que o usuário arrastou vence. */
function initialPos(id: string, index: number) {
  return loadPos(id) ?? { x: (index % 4) * 200, y: Math.floor(index / 4) * 230 };
}

interface Props {
  agents: CanvasAgent[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Painel que abre ao lado do agente selecionado (ex.: o chat). */
  panel?: (id: string) => React.ReactNode;
  /** Pares de agentes que já trocaram mensagens (ganham uma linha animada). */
  conversas?: [string, string][];
  className?: string;
}

function Inner({ agents, selectedId, onSelect, panel, conversas = [], className }: Props) {
  const built = useMemo<Node<AgentNodeData>[]>(
    () =>
      agents.map((agent, i) => ({
        id: agent.id,
        type: "agent",
        width: NODE_W,
        height: NODE_H,
        position: initialPos(agent.id, i),
        data: { agent, selected: selectedId === agent.id },
      })),
    // posições só na primeira montagem; o resto é sincronizado abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>(built);

  // Agentes que entram/saem ou mudam de estado, sem perder a posição arrastada.
  useEffect(() => {
    setNodes((cur) =>
      agents.map((agent, i) => {
        const old = cur.find((n) => n.id === agent.id);
        return {
          id: agent.id,
          type: "agent",
        width: NODE_W,
        height: NODE_H,
          position: old?.position ?? initialPos(agent.id, i),
          data: { agent, selected: selectedId === agent.id },
        };
      }),
    );
  }, [agents, selectedId, setNodes]);

  // O fitView do ReactFlow roda antes dos nós serem medidos; enquadra de novo.
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.4, maxZoom: 1 }), 80);
    return () => clearTimeout(t);
  }, [agents.length, fitView]);

  // Se o canvas nasceu sem largura (aba/painel escondido), enquadra quando ganhar uma.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let fitted = el.clientWidth > 0;
    const ro = new ResizeObserver(() => {
      if (!fitted && el.clientWidth > 0) {
        fitted = true;
        fitView({ padding: 0.4, maxZoom: 1 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitView]);

  // Linha fina do principal para cada agente; linha viva para quem conversou.
  const edges = useMemo<Edge[]>(() => {
    const boss = agents.find((a) => a.principal);
    const list: Edge[] = [];
    const seen = new Set<string>();
    for (const [a, b] of conversas) {
      const k = [a, b].sort().join("|");
      if (seen.has(k) || !agents.some((x) => x.id === a) || !agents.some((x) => x.id === b)) continue;
      seen.add(k);
      list.push({ id: `c-${k}`, source: a, target: b, animated: true, style: { stroke: "#8B5CF6", strokeWidth: 2 } });
    }
    if (boss) {
      for (const a of agents) {
        const k = [boss.id, a.id].sort().join("|");
        if (a.id === boss.id || seen.has(k)) continue;
        list.push({ id: `h-${a.id}`, source: boss.id, target: a.id, style: { stroke: "rgba(255,255,255,.18)", strokeDasharray: "4 5" } });
      }
    }
    return list;
  }, [agents, conversas]);

  // O painel abre pro lado com mais espaço: agentes da metade direita abrem pra esquerda.
  const panelSide = useMemo<"left" | "right">(() => {
    const xs = nodes.map((n) => n.position.x);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const sel = nodes.find((n) => n.id === selectedId);
    return sel && sel.position.x > mid ? "left" : "right";
  }, [nodes, selectedId]);

  const onDragStop = useCallback((_: unknown, node: Node) => {
    try {
      localStorage.setItem(storageKey(node.id), JSON.stringify(node.position));
    } catch {
      /* sem storage: a posição só não persiste */
    }
  }, []);

  return (
    <div ref={boxRef} className={cn("surface-flat no-elevation relative overflow-hidden rounded-3xl", className)} style={{ height: 620 }}>
      <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onDragStop}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        minZoom={0.4}
        maxZoom={1.6}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        {selectedId && panel && nodes.some((n) => n.id === selectedId) && (
          <NodeToolbar
            nodeId={selectedId}
            isVisible
            position={panelSide === "right" ? Position.Right : Position.Left}
            align="center"
            offset={20}
          >
            <div className="nodrag nowheel nopan">{panel(selectedId)}</div>
          </NodeToolbar>
        )}
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="#2a2a30" />
      </ReactFlow>
      </div>
    </div>
  );
}

/** Canvas com os agentes como orbes arrastáveis; a posição fica salva por agente. */
export function AgentsCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
