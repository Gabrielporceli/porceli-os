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
import { Add, Trash } from "iconsax-react";
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
}

function Interno({ kind, nodes: iniciais, edges: arestasIniciais, onChange }: Props) {
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
    <div className="relative h-full w-full">
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

      {/* Barra de criação. Flutua sobre o canvas em vez de ocupar coluna —
          num mapa mental a tela inteira é área de trabalho. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-black/70 p-1.5 backdrop-blur-xl">
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
              {["sim", "não"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => rotular(r)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors",
                    arestaSelecionada.label === r
                      ? "bg-white/90 text-black"
                      : "bg-white/[0.07] text-white/70 hover:bg-white/15"
                  )}
                >
                  {r}
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
      </div>

      <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/40 backdrop-blur">
        duplo clique no card pra escrever · puxe a bolinha e solte no vazio pra criar ligado
      </p>
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
