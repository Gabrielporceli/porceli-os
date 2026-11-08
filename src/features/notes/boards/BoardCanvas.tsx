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
  Position,
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
import { ArrowLeft2, Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { PillTabs } from "@/components/ui/pill-tabs";
import { QuadroNo } from "./nodes/QuadroNo";
import {
  FORMAS,
  PAPEIS_POR_TIPO,
  ROTULO_PAPEL,
  corDoNo,
  formaDoNo,
  tamanhoDoNo,
  type ArestaQuadro,
  type DadosNo,
  type FormaNo,
  type NoQuadro,
  type PapelNo,
  type TipoQuadro,
} from "./types";

const nodeTypes = { quadroNo: QuadroNo };
/** Setas neutras: roxo só em preenchimento e ícone (padrão de UI, regra 7). */
const COR_SETA = "rgba(255,255,255,0.55)";
const COR_SETA_SELECIONADA = "#fff";

const OPOSTO: Record<Position, Position> = {
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
};

/** Desenho pequeno da forma, para os botões da barra. */
function IconeForma({ forma, cor = "currentColor", fundo = "none" }: { forma: FormaNo; cor?: string; fundo?: string }) {
  const comum = { fill: fundo, stroke: cor, strokeWidth: 1.6, strokeLinejoin: "round" as const };
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
      {forma === "retangulo" && <rect x="1" y="2.5" width="14" height="9" rx="2" {...comum} />}
      {forma === "pilula" && <rect x="1" y="3" width="14" height="8" rx="4" {...comum} />}
      {forma === "circulo" && <circle cx="8" cy="7" r="6" {...comum} />}
      {forma === "losango" && <polygon points="8,1 15,7 8,13 1,7" {...comum} />}
      {forma === "triangulo" && <polygon points="8,1.5 15,12.5 1,12.5" {...comum} />}
    </svg>
  );
}

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
      // A seta sai da bolinha que foi puxada e chega no lado do card novo
      // virado para ela. Sem dizer as duas, o React Flow usa a primeira
      // âncora (a de cima) nas duas pontas.
      const lado = estado.fromHandle?.position ?? Position.Bottom;
      const chegada = OPOSTO[lado];
      const { w, h } = tamanhoDoNo({ papel });
      // O card nasce com a âncora de chegada no ponto onde a linha foi solta.
      const canto = {
        [Position.Left]: { x: pos.x, y: pos.y - h / 2 },
        [Position.Right]: { x: pos.x - w, y: pos.y - h / 2 },
        [Position.Top]: { x: pos.x - w / 2, y: pos.y },
        [Position.Bottom]: { x: pos.x - w / 2, y: pos.y - h },
      }[chegada];
      const novo = criarNo(papel, canto);
      setEdges((es) => [
        ...es,
        {
          id: crypto.randomUUID(),
          source: estado.fromNode!.id,
          sourceHandle: estado.fromHandle?.id ?? lado,
          target: novo.id,
          targetHandle: chegada,
          type: "default",
        } as Edge,
      ]);
    },
    [kind, criarNo, screenToFlowPosition, setEdges]
  );

  const arestaSelecionada = useMemo(() => edges.find((e) => e.selected) ?? null, [edges]);
  const nosSelecionados = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  // Com vários cards de formas diferentes, nenhuma aparece marcada.
  const formasSelecionadas = new Set(nosSelecionados.map((n) => formaDoNo(n.data as DadosNo)));
  const formaAtual = formasSelecionadas.size === 1 ? [...formasSelecionadas][0] : "";

  /** Troca a forma mantendo o centro do card no lugar. */
  const mudarForma = (forma: FormaNo) => {
    const ids = new Set(nosSelecionados.map((n) => n.id));
    setNodes((ns) =>
      ns.map((n) => {
        if (!ids.has(n.id)) return n;
        const dados = n.data as DadosNo;
        const antes = tamanhoDoNo(dados);
        const depois = tamanhoDoNo({ ...dados, forma });
        return {
          ...n,
          position: { x: n.position.x + (antes.w - depois.w) / 2, y: n.position.y + (antes.h - depois.h) / 2 },
          data: { ...dados, forma },
        };
      })
    );
  };

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
        markerEnd: { type: MarkerType.ArrowClosed, color: e.selected ? COR_SETA_SELECIONADA : COR_SETA },
        style: { stroke: e.selected ? COR_SETA_SELECIONADA : COR_SETA, strokeWidth: e.selected ? 2.2 : 1.8 },
        labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "rgb(47,45,46)", fillOpacity: 0.95 },
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
            className="w-48 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/40 hover:bg-white/[0.06] focus:bg-white/[0.08] sm:w-56"
          />
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/50">
            {kind === "mapa" ? "mapa mental" : "fluxograma"}
          </span>
          <button
            type="button"
            onClick={onDelete}
            title="Excluir quadro"
            aria-label="Excluir quadro"
            className="acao-vidro so-icone perigo"
          >
            <Icon as={Trash} size={14} />
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
                title={`Adicionar ${ROTULO_PAPEL[papel].toLowerCase()}`}
                className="acao-vidro"
              >
                <IconeForma forma={formaDoNo({ papel })} cor={cor.borda} fundo={cor.fundo} />
                {ROTULO_PAPEL[papel]}
              </button>
            );
          })}

          {arestaSelecionada && (
            <>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <span className="pl-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/40">seta</span>
              <PillTabs
                items={[{ value: "sim", label: "sim" }, { value: "não", label: "não" }]}
                value={typeof arestaSelecionada.label === "string" ? arestaSelecionada.label : ""}
                onChange={rotular}
              />
              <button
                type="button"
                onClick={() => rotular(null)}
                title="Tirar o rótulo da seta"
                aria-label="Tirar o rótulo da seta"
                className="acao-vidro so-icone perigo"
              >
                <Icon as={Trash} size={13} />
              </button>
            </>
          )}

          {nosSelecionados.length > 0 && (
            <>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <span className="pl-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/40">forma</span>
              <PillTabs
                items={FORMAS.map((f) => ({
                  value: f.id,
                  label: (
                    <span title={f.rotulo} aria-label={f.rotulo} className="flex h-4 items-center">
                      <IconeForma forma={f.id} />
                    </span>
                  ),
                }))}
                value={formaAtual}
                onChange={(v) => mudarForma(v as FormaNo)}
                className="flex-nowrap [&>button]:!px-2.5"
              />
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
          className="quadro-flow"
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
