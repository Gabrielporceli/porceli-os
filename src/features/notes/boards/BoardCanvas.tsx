/**
 * Canvas dos quadros — mapa mental e fluxograma.
 *
 * NÃO reusa o FunnelCanvas de propósito: aquele carrega matemática de funil,
 * inserção automática de nó de taxa e uma paleta de variantes de campanha.
 * Nada disso existe num mapa mental, e herdar tudo só pra aproveitar o
 * ReactFlow custaria mais em condicional do que estas ~150 linhas.
 *
 * Gravação: com atraso de 600ms. O canvas dispara a cada pixel arrastado;
 * gravar direto viraria centenas de UPDATEs num arrasto só.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Add, ArrowLeft2, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { QuadroNo } from "./nodes/QuadroNo";
import {
  PAPEIS_POR_TIPO,
  ROTULO_PAPEL,
  corDoNo,
  type ArestaQuadro,
  type NoQuadro,
  type PapelNo,
  type TipoQuadro,
} from "./types";

const nodeTypes = { quadroNo: QuadroNo };
const ROXO = "#8b5cf6";

/** Cor padrão por papel, pra um fluxograma novo já nascer legível. */
const COR_PADRAO: Record<PapelNo, number> = {
  central: 0, ideia: 0, inicio: 2, etapa: 1, decisao: 3, fim: 4,
};

interface Props {
  kind: TipoQuadro;
  nodes: NoQuadro[];
  edges: ArestaQuadro[];
  onChange: (nodes: NoQuadro[], edges: ArestaQuadro[]) => void;
  /** Cabeçalho flutuante (fora do canvas): nome, voltar e excluir. */
  title: string;
  onTitle: (t: string) => void;
  onBack: () => void;
  onDelete: () => void;
}

function Interno({ kind, nodes: iniciais, edges: arestasIniciais, onChange, title, onTitle, onBack, onDelete }: Props) {
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(iniciais as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    arestasIniciais.map((e) => ({ ...e, type: "default", label: e.label ?? undefined })) as Edge[]
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gravação adiada. `nodes`/`edges` mudam a cada frame do arrasto.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(
        nodes.map((n) => ({
          id: n.id, type: "quadroNo", position: n.position, data: n.data,
        })) as NoQuadro[],
        edges.map((e) => ({
          id: e.id, source: e.source, target: e.target,
          sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
          label: typeof e.label === "string" ? e.label : null,
        }))
      );
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const criarNo = useCallback(
    (papel: PapelNo, pos?: { x: number; y: number }) => {
      // Sem posição informada, nasce no centro do que está visível — e não em
      // (0,0), que pode estar fora da tela depois de qualquer deslocamento.
      const vp = getViewport();
      const centro = pos ?? screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 40,
      });
      void vp;
      const novo: Node = {
        id: crypto.randomUUID(),
        type: "quadroNo",
        position: centro,
        data: { texto: "", papel, cor: COR_PADRAO[papel] },
      };
      setNodes((ns) => [...ns, novo]);
      return novo;
    },
    [getViewport, screenToFlowPosition, setNodes]
  );

  const onConnect = useCallback(
    (p: Connection) => setEdges((es) => addEdge({ ...p, type: "default" } as Edge, es)),
    [setEdges]
  );

  /** Soltar a linha no vazio cria o próximo nó já ligado — é o gesto que faz
   *  um mapa mental crescer rápido, sem voltar na barra a cada ramo. */
  const onConnectEnd = useCallback(
    (evento: MouseEvent | TouchEvent, estado: FinalConnectionState) => {
      if (estado.toNode || !estado.fromNode) return;
      const ponto = "changedTouches" in evento ? evento.changedTouches[0] : evento;
      const pos = screenToFlowPosition({ x: ponto.clientX, y: ponto.clientY });
      const papel: PapelNo = kind === "mapa" ? "ideia" : "etapa";
      const novo = criarNo(papel, { x: pos.x - 85, y: pos.y - 33 });
      setEdges((es) => [
        ...es,
        { id: crypto.randomUUID(), source: estado.fromNode!.id, target: novo.id, type: "default" } as Edge,
      ]);
    },
    [kind, criarNo, screenToFlowPosition, setEdges]
  );

  const arestaSelecionada = useMemo(() => edges.find((e) => e.selected) ?? null, [edges]);

  const rotular = (rotulo: string | null) => {
    if (!arestaSelecionada) return;
    setEdges((es) =>
      es.map((e) => (e.id === arestaSelecionada.id ? { ...e, label: rotulo ?? undefined } : e))
    );
  };

  const arestasDesenhadas = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: ROXO },
        style: { stroke: ROXO, strokeWidth: 1.8 },
        labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "#1a1a20", fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
      })),
    [edges]
  );

  return (
    <div className="flex h-full w-full flex-col gap-3">
      {/* Barra fora do canvas, em pílulas flutuantes como no mapa de funil. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="liquid-glass no-elevation flex items-center gap-3 rounded-full py-1.5 pl-3 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white/90"
          >
            <Icon as={ArrowLeft2} size={14} />
            Voltar
          </button>
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Nome do quadro"
            className="w-48 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/40 hover:bg-white/[0.06] focus:bg-white/[0.08] sm:w-56"
          />
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/50">
            {kind === "mapa" ? "mapa mental" : "fluxograma"}
          </span>
          <button
            type="button"
            onClick={onDelete}
            title="Excluir quadro"
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Icon as={Trash} size={15} />
          </button>
        </div>

        <div className="liquid-glass no-elevation flex flex-wrap items-center gap-1.5 rounded-full p-1.5">
          {PAPEIS_POR_TIPO[kind].map((papel) => {
            const cor = corDoNo(COR_PADRAO[papel]);
            return (
              <button
                key={papel}
                type="button"
                onClick={() => criarNo(papel)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/80 transition-colors hover:text-white"
                style={{ background: cor.fundo, border: `1px solid ${cor.borda}` }}
              >
                <Icon as={Add} size={13} />
                {ROTULO_PAPEL[papel]}
              </button>
            );
          })}

          {arestaSelecionada && (
            <>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <span className="pl-1 text-[11px] uppercase tracking-wider text-white/40">seta</span>
              {["sim", "não"].map((rot) => (
                <button
                  key={rot}
                  type="button"
                  onClick={() => rotular(rot)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors",
                    arestaSelecionada.label === rot
                      ? "bg-white/90 text-black"
                      : "bg-white/[0.07] text-white/70 hover:bg-white/15"
                  )}
                >
                  {rot}
                </button>
              ))}
              <button
                type="button"
                onClick={() => rotular(null)}
                title="Tirar o rótulo da seta"
                className="rounded-full bg-white/[0.07] px-2 py-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white/80"
              >
                <Icon as={Trash} size={13} />
              </button>
            </>
          )}
        </div>

        <p className="text-[11px] text-white/35">
          duplo clique no card pra escrever · puxe a bolinha e solte no vazio pra criar ligado
        </p>
      </div>

      {/* Canvas isolado na própria caixa. */}
      <div className="surface-flat no-elevation relative min-h-0 flex-1 overflow-hidden !rounded-2xl">
        <ReactFlow
          nodes={nodes}
          edges={arestasDesenhadas}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Delete", "Backspace"]}
        >
          <Controls showInteractive={false} />
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="#2a2a30" />
        </ReactFlow>
      </div>
    </div>
  );
}

export function BoardCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Interno {...props} />
    </ReactFlowProvider>
  );
}
