import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type InternalNode,
  type EdgeProps,
  type EdgeTypes,
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  type Edge,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { AgentTerminal } from "@/features/agents/terminal/AgentTerminal";
import { CORES, COR_TERMINAL, comAlfa, corDoAgente } from "@/features/agents/terminal/cores";
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
          <span className="absolute -right-2 -top-1 z-10 rounded-full bg-[#4a4849] px-1.5 py-0.5 text-[9px] font-black uppercase text-white/85">
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


/* ─────────────────────────── modo terminal ─────────────────────────── */

type TerminalNodeData = AgentNodeData & {
  onEdit?: (id: string) => void;
  onSelect?: (id: string) => void;
  onRename?: (id: string, nome: string) => void;
  onColor?: (id: string, cor: AvatarColor) => void;
};

/** Bolinha da cor na barra de título; abre a paleta com as 12 cores dos agentes. */
function SeletorCor({ atual, valor, onEscolher }: { atual: string; valor?: AvatarColor; onEscolher: (c: AvatarColor) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);
  return (
    <div ref={ref} className="nodrag relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/10"
        title="Cor deste terminal"
      >
        <span className="h-3 w-3 rounded-full ring-1 ring-white/30" style={{ background: atual }} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-8 z-50 grid w-[132px] grid-cols-4 gap-1.5 rounded-xl border border-white/10 bg-[#141418] p-2 shadow-2xl">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => {
                onEscolher(c);
                setAberto(false);
              }}
              className={cn(
                "h-6 w-6 rounded-full transition hover:scale-110",
                valor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#141418]" : "",
              )}
              style={{ background: COR_TERMINAL[c] }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Nome na barra de título; duplo clique vira campo, Enter salva, Esc cancela. */
function NomeEditavel({ nome, onSalvar }: { nome: string; onSalvar?: (nome: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  if (!editando || !onSalvar) {
    return (
      <span
        className={cn("truncate text-[13px] font-bold text-white", onSalvar && "cursor-text")}
        title={onSalvar ? "Duplo clique para renomear" : undefined}
        onDoubleClick={(e) => {
          if (!onSalvar) return;
          // Sem isto o duplo clique também dispara o "focar" da barra.
          e.stopPropagation();
          setValor(nome);
          setEditando(true);
        }}
      >
        {nome}
      </span>
    );
  }
  const salvar = () => {
    const v = valor.trim();
    if (v && v !== nome) onSalvar(v);
    setEditando(false);
  };
  return (
    <input
      autoFocus
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => {
        if (e.key === "Enter") salvar();
        if (e.key === "Escape") setEditando(false);
        e.stopPropagation();
      }}
      onFocus={(e) => e.target.select()}
      className="nodrag w-40 rounded-md border border-violet-400/50 bg-black/40 px-1.5 py-0.5 text-[13px] font-bold text-white outline-none"
    />
  );
}

const STATUS_DOT: Record<AgentStatus, string> = {
  ativo: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]",
  parado: "bg-white/30",
  erro: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,.7)]",
};

/** Janela de terminal: arrasta pela barra de título, redimensiona pelas bordas. */
function TerminalNode({ id, data }: NodeProps<Node<TerminalNodeData>>) {
  const { agent: a, selected, onEdit, onSelect, onRename, onColor } = data;
  const { fitView } = useReactFlow();
  const cor = corDoAgente(a);
  const focar = () => fitView({ nodes: [{ id }], padding: 0.12, maxZoom: 1.3, duration: 350 });
  return (
    <>
      <NodeResizer
        minWidth={TERM_MIN_W}
        minHeight={TERM_MIN_H}
        // Sempre ativo, mas invisível: as bolinhas só aparecem com o mouse
        // perto da borda (CSS .term-handle / .term-line em index.css).
        isVisible
        lineClassName="term-line"
        handleClassName="term-handle"
        handleStyle={{ ["--term-cor" as string]: cor }}
        onResizeEnd={(_, p) => saveSize(id, { width: p.width, height: p.height })}
      />
      <Handle type="target" position={Position.Top} className="!pointer-events-none !h-0 !w-0 !border-0 !bg-transparent !top-1/2 !left-1/2" />
      <Handle type="source" position={Position.Top} className="!pointer-events-none !h-0 !w-0 !border-0 !bg-transparent !top-1/2 !left-1/2" />
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-[#0b0b0f] transition-[border-color,box-shadow]"
        style={{
          borderColor: comAlfa(cor, selected ? 0.6 : 0.22),
          boxShadow: selected
            ? `0 0 0 1px ${comAlfa(cor, 0.3)}, 0 0 28px -6px ${comAlfa(cor, 0.45)}, 0 18px 50px -12px rgba(0,0,0,.8)`
            : "0 18px 50px -12px rgba(0,0,0,.8)",
        }}
        onMouseDownCapture={() => onSelect?.(id)}
      >
        <div
          className="term-drag flex h-10 shrink-0 cursor-grab items-center gap-2.5 border-b px-3 active:cursor-grabbing"
          style={{
            borderColor: comAlfa(cor, 0.18),
            background: `linear-gradient(90deg, ${comAlfa(cor, 0.16)}, ${comAlfa(cor, 0.04)})`,
          }}
          onDoubleClick={focar}
          title="Arraste para mover · duplo clique para ampliar"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[a.status])} />
          <NomeEditavel nome={a.nome} onSalvar={onRename ? (n) => onRename(id, n) : undefined} />
          <span className="hidden truncate text-[11px] text-white/35 sm:inline">{a.papel}</span>
          {a.principal && (
            <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
              Principal
            </span>
          )}
          <div className="nodrag ml-auto flex items-center gap-1">
            {onColor && <SeletorCor atual={cor} valor={a.cor} onEscolher={(c) => onColor(id, c)} />}
            <button
              type="button"
              onClick={focar}
              className="rounded-md px-1.5 py-0.5 text-[11px] text-white/40 hover:bg-white/10 hover:text-white"
              title="Ampliar este terminal (Ver todos volta à visão geral)"
            >
              Ampliar
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(id)}
                className="rounded-md px-1.5 py-0.5 text-[11px] text-white/40 hover:bg-white/10 hover:text-white"
                title="Editar agente"
              >
                Editar
              </button>
            )}
          </div>
        </div>
        <div className="nodrag nowheel nopan min-h-0 flex-1 cursor-text">
          <AgentTerminal agentId={id} cor={cor} onFocus={() => onSelect?.(id)} />
        </div>
      </div>
    </>
  );
}

const TERM_W = 560;
const TERM_H = 340;
const TERM_MIN_W = 360;
const TERM_MIN_H = 200;
const termPosKey = (id: string) => `agents-canvas:term:pos:${id}`;
const termSizeKey = (id: string) => `agents-canvas:term:size:${id}`;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveSize(id: string, size: { width: number; height: number }) {
  try {
    localStorage.setItem(termSizeKey(id), JSON.stringify(size));
  } catch {
    /* sem storage: o tamanho só não persiste */
  }
}

/** Grade de 2 colunas para terminais; a posição arrastada vence. */
function termInitialPos(id: string, index: number) {
  return (
    readJSON<{ x: number; y: number }>(termPosKey(id)) ?? {
      x: (index % 2) * (TERM_W + 40),
      y: Math.floor(index / 2) * (TERM_H + 40),
    }
  );
}

function termSize(id: string) {
  return readJSON<{ width: number; height: number }>(termSizeKey(id)) ?? { width: TERM_W, height: TERM_H };
}

/** Volta os terminais para a grade e o tamanho padrão. */
export function resetTerminalLayout(ids: string[]) {
  try {
    ids.forEach((id) => {
      localStorage.removeItem(termPosKey(id));
      localStorage.removeItem(termSizeKey(id));
    });
  } catch {
    /* nada a limpar */
  }
}

// Tamanho conhecido de saída: o fitView não depende de medir o DOM.
const NODE_W = 144;
const NODE_H = 190;

const nodeTypes: NodeTypes = { agent: AgentNode, terminal: TerminalNode };

type ConversaEdgeData = { de: string; para: string };

/** Centro e meia-largura/altura de um nó no espaço do canvas. */
function caixa(n: InternalNode) {
  const w = n.measured.width ?? n.width ?? 0;
  const h = n.measured.height ?? n.height ?? 0;
  const { x, y } = n.internals.positionAbsolute;
  return { cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2 };
}

/** Onde a reta do centro deste nó até o ponto (tx, ty) cruza a borda dele. */
function pontoNaBorda(n: InternalNode, tx: number, ty: number) {
  const { cx, cy, hw, hh } = caixa(n);
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Linha de conversa: degradê da cor de quem enviou a última mensagem até a
 * cor de quem recebeu. A linha vai de BORDA a borda (não de centro a centro):
 * assim a parte visível é a linha inteira, e cada ponta tem 100% da cor do
 * seu card, mesmo com cards de tamanhos diferentes.
 */
function ConversaEdge({ id, source, target, data, style }: EdgeProps<Edge<ConversaEdgeData>>) {
  const de = useInternalNode(source);
  const para = useInternalNode(target);
  if (!de || !para) return null;
  const cDe = caixa(de);
  const cPara = caixa(para);
  const a = pontoNaBorda(de, cPara.cx, cPara.cy);
  const b = pontoNaBorda(para, cDe.cx, cDe.cy);
  const [sourceX, sourceY, targetX, targetY] = [a.x, a.y, b.x, b.y];
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  // Só letras, números e hífen: "|" no id quebra a referência url(#...) em alguns navegadores.
  const gid = `conversa-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={data?.de ?? "#8B5CF6"} />
          <stop offset="100%" stopColor={data?.para ?? "#8B5CF6"} />
        </linearGradient>
      </defs>
      <BaseEdge id={id} path={path} style={{ ...style, stroke: `url(#${gid})`, strokeWidth: 2 }} />
    </>
  );
}

const edgeTypes: EdgeTypes = { conversa: ConversaEdge };

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
  /** Ocupa 100% da altura do contêiner (quem chama define a altura). */
  fill?: boolean;
  /** "orb" (padrão) desenha orbes; "terminal" desenha uma janela de terminal por agente. */
  variant?: "orb" | "terminal";
  /** Botão "Editar" da janela de terminal. */
  onEdit?: (id: string) => void;
  /** Renomear direto na barra de título (duplo clique no nome). */
  onRename?: (id: string, nome: string) => void;
  /** Trocar a cor do terminal pela bolinha da barra de título. */
  onColor?: (id: string, cor: AvatarColor) => void;
  /** Ao mudar, volta todos para a grade padrão e reenquadra (botão "Organizar"). */
  layoutVersion?: number;
  /** Ao mudar, só afasta o zoom para mostrar todos, sem mexer nas posições (botão "Ver todos"). */
  fitVersion?: number;
}

function Inner({
  agents,
  selectedId,
  onSelect,
  panel,
  conversas = [],
  className,
  fill,
  variant = "orb",
  onEdit,
  onRename,
  onColor,
  layoutVersion = 0,
  fitVersion = 0,
}: Props) {
  const term = variant === "terminal";
  const { fitView } = useReactFlow();

  const toNode = useCallback(
    (agent: CanvasAgent, i: number, old?: Node<AgentNodeData>, resetPos = false): Node<AgentNodeData> => {
      // A medida que o canvas já fez TEM de ser repassada: sem `measured`, o
      // React Flow trata o nó como não medido, e o fitView (Ampliar, Ver todos)
      // fica esperando uma medição que não vem, porque o tamanho não mudou.
      const measured = old?.measured ? { measured: old.measured } : {};
      const pos = resetPos ? undefined : old?.position;
      if (!term) {
        return {
          id: agent.id,
          type: "agent",
          width: NODE_W,
          height: NODE_H,
          ...measured,
          position: pos ?? initialPos(agent.id, i),
          data: { agent, selected: selectedId === agent.id },
        };
      }
      const size =
        !resetPos && old?.width && old?.height ? { width: old.width, height: old.height } : termSize(agent.id);
      const data: TerminalNodeData = { agent, selected: selectedId === agent.id, onEdit, onSelect, onRename, onColor };
      return {
        id: agent.id,
        type: "terminal",
        dragHandle: ".term-drag",
        ...size,
        ...measured,
        position: pos ?? termInitialPos(agent.id, i),
        data,
      };
    },
    [term, selectedId, onEdit, onSelect, onRename, onColor],
  );

  const built = useMemo<Node<AgentNodeData>[]>(
    () => agents.map((agent, i) => toNode(agent, i)),
    // posições só na primeira montagem; o resto é sincronizado abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>(built);

  // Agentes que entram/saem ou mudam de estado, sem perder posição nem tamanho.
  useEffect(() => {
    setNodes((cur) => agents.map((agent, i) => toNode(agent, i, cur.find((n) => n.id === agent.id))));
  }, [agents, toNode, setNodes]);

  // O fitView do ReactFlow roda antes dos nós serem medidos; enquadra de novo.
  const fitOpts = useMemo(() => (term ? { padding: 0.15, maxZoom: 1 } : { padding: 0.4, maxZoom: 1.25 }), [term]);
  // Os terminais demoram mais a ser medidos que os orbes: só enquadra depois
  // que o canvas confirmar a medida de todos os nós.
  const initialized = useNodesInitialized();
  useEffect(() => {
    if (!initialized) return;
    const t = setTimeout(() => fitView(fitOpts), 80);
    return () => clearTimeout(t);
  }, [initialized, agents.length, fitView, fitOpts]);

  // "Ver todos": só reenquadra.
  useEffect(() => {
    if (fitVersion) fitView({ ...fitOpts, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitVersion]);

  // "Organizar": volta à grade padrão e reenquadra.
  useEffect(() => {
    if (!layoutVersion) return;
    setNodes((cur) => agents.map((agent, i) => toNode(agent, i, cur.find((n) => n.id === agent.id), true)));
    const t = setTimeout(() => fitView({ ...fitOpts, duration: 300 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  // Se o canvas nasceu sem largura (aba/painel escondido), enquadra quando ganhar uma.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // Reenquadra quando o canvas muda de tamanho (e ao ganhar o primeiro tamanho).
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) fitView(fitOpts);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitView, fitOpts]);

  // Linha fina do principal para cada agente; linha viva para quem conversou.
  const edges = useMemo<Edge[]>(() => {
    const boss = agents.find((a) => a.principal);
    const list: Edge[] = [];
    const seen = new Set<string>();
    // Um par por linha; a direção é a da ÚLTIMA mensagem trocada entre os dois.
    const ultima = new Map<string, [string, string]>();
    for (const [a, b] of conversas) {
      if (!agents.some((x) => x.id === a) || !agents.some((x) => x.id === b)) continue;
      ultima.set([a, b].sort().join("|"), [a, b]);
    }
    for (const [k, [a, b]] of ultima) {
      seen.add(k);
      const de = agents.find((x) => x.id === a)!;
      const para = agents.find((x) => x.id === b)!;
      list.push({
        id: `c-${k}`,
        type: "conversa",
        source: a,
        target: b,
        animated: true,
        data: { de: corDoAgente(de), para: corDoAgente(para) },
      });
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
      localStorage.setItem(term ? termPosKey(node.id) : storageKey(node.id), JSON.stringify(node.position));
    } catch {
      /* sem storage: a posição só não persiste */
    }
  }, [term]);

  return (
    <div ref={boxRef} className={cn("surface-flat no-elevation relative overflow-hidden rounded-3xl", className)} style={fill ? { height: "100%" } : { height: "max(560px, calc(100vh - 11rem))" }}>
      {/* Recorte 6px para dentro: recortando na própria borda, o terminal passava por cima dela. */}
      <div className="absolute inset-1.5 overflow-hidden rounded-[1.25rem]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onDragStop}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        fitView
        fitViewOptions={fitOpts}
        minZoom={term ? 0.25 : 0.4}
        maxZoom={1.6}
        // Nos terminais, espaço, backspace e shift pertencem ao terminal, não ao canvas.
        deleteKeyCode={null}
        panActivationKeyCode={term ? null : "Space"}
        selectionKeyCode={term ? null : "Shift"}
        zoomOnDoubleClick={!term}
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
        {/* Os pontos encolhem com o zoom: tamanho e contraste pensados para continuarem
            visíveis afastado (os terminais abrem perto de 40%). */}
        <Background variant={BackgroundVariant.Dots} gap={22} size={2.6} color="rgba(255,255,255,0.16)" />
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
