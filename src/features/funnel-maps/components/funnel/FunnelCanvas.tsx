import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FunnelNode } from './nodes/FunnelNode';
import { PageNode } from './nodes/PageNode';
import { NoteNode } from './nodes/NoteNode';
import { ImageNode } from './nodes/ImageNode';
import { ForecastNode } from './nodes/ForecastNode';
import { FunnelChartNode } from './nodes/FunnelChartNode';
import { PathEdge } from './edges/PathEdge';
import { CanvasActions } from './CanvasActions';
import { AlignGuides } from './AlignGuides';
import { Palette, type DragPayload } from './Palette';
import { QuickAddMenu } from './QuickAddMenu';
import { FunnelActionsContext } from './funnelContext';
import { computeFunnelMetrics, computeForecastSummary } from '../../lib/funnelMath';
import { arrangeNodes } from '../../lib/funnelLayout';
import { alignNodes, snapToOthers, type AlignMode } from '../../lib/funnelAlign';
import { findIssues } from '../../lib/funnelIssues';
import { firstLeadIds } from '../../lib/leadStep';
import { buildFunnelStages } from '../../lib/funnelChart';
import { migrateRateNodes } from '../../lib/migrateRateNodes';
import { edgeRateFields, rateBounds, rateFor, resolveScenario, SCENARIOS, withScenarioValue, type Scenario } from '../../lib/scenarios';
import { findVariant, type CanvasNodeType, type FunnelMapEdge, type FunnelMapNode, type FunnelNodeCategory } from '../../types/funnel';

const nodeTypes = { funnelNode: FunnelNode, pageNode: PageNode, noteNode: NoteNode, imageNode: ImageNode, forecastNode: ForecastNode, funnelChartNode: FunnelChartNode };
const edgeTypes = { pathEdge: PathEdge };

const GRID = 18;
const HISTORY_LIMIT = 60;
/** Edições seguidas dentro desta janela viram UM passo de histórico (digitar
 *  um número não pode gerar um "desfazer" por tecla). */
const HISTORY_COALESCE_MS = 700;

/** Cards que representam um passo real do funil (os que têm entrada/saída). */
function isFunnelLike(node: Node): boolean {
  return node.type === 'funnelNode' || node.type === 'pageNode';
}

function defaultDataForPayload(payload: DragPayload) {
  if (payload.type === 'noteNode') return { text: '' };
  if (payload.type === 'imageNode') return { src: null };
  if (payload.type === 'forecastNode' || payload.type === 'funnelChartNode') return {};
  const { category } = payload;
  const base = { category, variant: payload.variantId, label: '' };
  if (category === 'traffic') return { ...base, visitors: 500 };
  return base;
}

function pathEdge(source: string, target: string, extra?: Partial<Edge>): Edge {
  return { id: crypto.randomUUID(), source, target, type: 'pathEdge', data: { rateLow: 100, rateHigh: 100 }, ...extra } as Edge;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

interface QuickAddState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

interface FunnelCanvasProps {
  nodes: FunnelMapNode[];
  edges: FunnelMapEdge[];
  onChange: (patch: { nodes: FunnelMapNode[]; edges: FunnelMapEdge[] }) => void;
  /** Barra no topo do card do canvas (a Toolbar do mapa). */
  header?: ReactNode;
}

function CanvasInner({ nodes: initialNodes, edges: initialEdges, onChange, header }: FunnelCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Mapas antigos tinham a taxa num cartão entre dois cards; aqui ela passa
  // para a própria conexão. Mapas novos passam sem mudança.
  const [initial] = useState(() => migrateRateNodes(initialNodes, initialEdges));
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initial.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      type: 'pathEdge',
      data: { rateLow: e.rateLow ?? e.rate ?? 100, rateHigh: e.rateHigh ?? e.rate ?? 100, rateReal: e.rateReal, curve: e.curve, dashed: e.dashed },
    })) as Edge[],
  );
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);
  const [snap, setSnap] = useState(true);
  const [scenario, setScenario] = useState<Scenario>('mid');
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  // Última posição já alinhada pelas guias. Ao soltar, a biblioteca devolve a
  // posição "crua" do mouse; sem isto o card pulava da guia pro ponto cru.
  const lastSnap = useRef<{ id: string; pos: { x: number; y: number } } | null>(null);
  // Estado mais recente, pra gravar depois que o React aplicar a posição final.
  const latest = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });

  // ── Histórico (desfazer / refazer) ────────────────────────────────────
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const current = useRef<Snapshot | null>(null);
  if (current.current === null) current.current = { nodes, edges };
  const lastRecord = useRef(0);
  const [, bumpHistory] = useState(0);

  const persist = useCallback(
    (nds: Node[], eds: Edge[]) => {
      onChange({
        nodes: nds.map((n) => ({ id: n.id, type: (n.type ?? 'funnelNode') as CanvasNodeType, position: n.position, data: n.data }) as unknown as FunnelMapNode),
        edges: eds.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
          ...edgeRateFields(e.data as { rate?: number; rateLow?: number; rateHigh?: number; rateReal?: number } | undefined),
          curve: (e.data as { curve?: 'bezier' | 'straight' } | undefined)?.curve,
          dashed: (e.data as { dashed?: boolean } | undefined)?.dashed,
        })),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Toda mudança passa por aqui: grava no histórico e persiste.
  const emit = useCallback(
    (nds: Node[], eds: Edge[]) => {
      const now = Date.now();
      if (now - lastRecord.current > HISTORY_COALESCE_MS && current.current) {
        past.current.push(current.current);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
      }
      lastRecord.current = now;
      future.current = [];
      current.current = { nodes: nds, edges: eds };
      bumpHistory((v) => v + 1);
      persist(nds, eds);
    },
    [persist],
  );

  const restore = useCallback(
    (shot: Snapshot) => {
      current.current = shot;
      setNodes(shot.nodes);
      setEdges(shot.edges);
      persist(shot.nodes, shot.edges);
      bumpHistory((v) => v + 1);
    },
    [setNodes, setEdges, persist],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !current.current) return;
    future.current.push(current.current);
    lastRecord.current = 0;
    restore(prev);
  }, [restore]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !current.current) return;
    past.current.push(current.current);
    lastRecord.current = 0;
    restore(next);
  }, [restore]);

  // ── Copiar / colar / duplicar ─────────────────────────────────────────
  const clipboard = useRef<{ nodes: Node[]; edges: Edge[]; pastes: number } | null>(null);

  const copy = useCallback(() => {
    const picked = nodes.filter((n) => n.selected);
    if (picked.length === 0) return false;
    const ids = new Set(picked.map((n) => n.id));
    clipboard.current = {
      nodes: picked,
      edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      pastes: 0,
    };
    return true;
  }, [nodes, edges]);

  const paste = useCallback(() => {
    const c = clipboard.current;
    if (!c) return;
    c.pastes += 1;
    const offset = 36 * c.pastes;
    const idMap = new Map(c.nodes.map((n) => [n.id, crypto.randomUUID()]));
    const copies: Node[] = c.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: true,
    }));
    const copiedEdges: Edge[] = c.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      selected: false,
    }));
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), ...copies];
    const nextEdges = [...edges, ...copiedEdges];
    setNodes(nextNodes);
    setEdges(nextEdges);
    emit(nextNodes, nextEdges);
  }, [nodes, edges, setNodes, setEdges, emit]);

  const duplicate = useCallback(() => {
    if (copy()) paste();
  }, [copy, paste]);

  // ── Arrumar ───────────────────────────────────────────────────────────
  const arrange = useCallback(() => {
    const positions = arrangeNodes(nodes, edges);
    if (positions.size === 0) return;
    const nextNodes = nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n));
    setNodes(nextNodes);
    emit(nextNodes, edges);
    requestAnimationFrame(() => fitView({ duration: 300, padding: 0.15 }));
  }, [nodes, edges, setNodes, emit, fitView]);

  // Atalhos. Ficam em uma ref pra o listener, registrado uma vez, sempre usar
  // as versões mais recentes. Dentro de campos de texto o atalho é do campo.
  const shortcuts = useRef({ undo, redo, copy, paste, duplicate });
  shortcuts.current = { undo, redo, copy, paste, duplicate };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const s = shortcuts.current;
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo(); else s.undo();
      } else if (key === 'y') {
        e.preventDefault();
        s.redo();
      } else if (key === 'd') {
        e.preventDefault();
        s.duplicate();
      } else if (key === 'c') {
        s.copy();
      } else if (key === 'v') {
        e.preventDefault();
        s.paste();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Arrasto de UM card: puxa pra alinhar com os outros e mostra as guias.
  // Vários cards movidos juntos não usam guias (manteriam o grupo torto).
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const moves = changes.filter((c): c is NodePositionChange => c.type === 'position');
      const drag = moves.length === 1 ? moves[0] : null;
      if (drag?.dragging && drag.position) {
        const r = snapToOthers(drag.id, drag.position, nodes);
        setGuides({ x: r.guideX, y: r.guideY });
        lastSnap.current = { id: drag.id, pos: r.pos };
        onNodesChange(changes.map((c) => (c === drag ? { ...drag, position: r.pos } : c)));
        return;
      }
      if (moves.some((m) => m.dragging === false)) {
        setGuides({});
        const snapped = lastSnap.current;
        lastSnap.current = null;
        if (snapped) {
          // Soltou: mantém o card exatamente onde a guia o deixou.
          onNodesChange(
            changes.map((c) =>
              c.type === 'position' && c.id === snapped.id && c.position ? { ...c, position: snapped.pos } : c,
            ),
          );
          return;
        }
      }
      onNodesChange(changes);
    },
    [nodes, onNodesChange],
  );

  // Alinhar / distribuir os cards selecionados.
  const alignSelected = useCallback(
    (mode: AlignMode) => {
      const positions = alignNodes(nodes.filter((n) => n.selected), mode);
      if (positions.size === 0) return;
      const nextNodes = nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n));
      setNodes(nextNodes);
      emit(nextNodes, edges);
    },
    [nodes, edges, setNodes, emit],
  );

  // ── Conexões e criação ────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      const next = addEdge({ ...params, type: 'pathEdge', data: { rateLow: 100, rateHigh: 100 } } as unknown as Edge, edges);
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setEdges, emit],
  );

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
    if (connectionState.toNode || !connectionState.fromNode) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    setQuickAdd({ sourceId: connectionState.fromNode.id, screenX: point.clientX, screenY: point.clientY });
  }, []);

  const createFromQuickAdd = useCallback(
    (category: FunnelNodeCategory, variantId: string) => {
      if (!quickAdd) return;
      const position = screenToFlowPosition({ x: quickAdd.screenX, y: quickAdd.screenY });
      const id = crypto.randomUUID();
      const nodeType = category === 'page' ? 'pageNode' : 'funnelNode';
      const data = defaultDataForPayload({ type: nodeType, category, variantId });
      const newNode: Node = { id, type: nodeType, position, data };

      const nextNodes = [...nodes, newNode];
      const nextEdges = [...edges, pathEdge(quickAdd.sourceId, id)];

      setNodes(nextNodes);
      setEdges(nextEdges);
      emit(nextNodes, nextEdges);
      setQuickAdd(null);
    },
    [quickAdd, nodes, edges, screenToFlowPosition, setNodes, setEdges, emit],
  );

  // Grava depois do próximo quadro: assim já vale a posição final do card, e
  // não a do render anterior ao soltar.
  const handleNodeDragStop = useCallback(() => {
    requestAnimationFrame(() => emit(latest.current.nodes, latest.current.edges));
  }, [emit]);

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const next = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
      setNodes(next);
      emit(next, edges);
    },
    [nodes, edges, setNodes, emit],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const nextNodes = nodes.filter((n) => n.id !== id);
      const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
      setNodes(nextNodes);
      setEdges(nextEdges);
      emit(nextNodes, nextEdges);
    },
    [nodes, edges, setNodes, setEdges, emit],
  );

  const updateEdgeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const next = edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } } : e));
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setEdges, emit],
  );

  const setEdgeRate = useCallback(
    (edgeId: string, sc: Scenario, value: number) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;
      if (sc === 'real') {
        updateEdgeData(edgeId, { rateReal: Math.min(100, Math.max(0, value)) });
        return;
      }
      const b = rateBounds(edge.data as never);
      const next = withScenarioValue(b.low, b.high, sc, value, 100);
      updateEdgeData(edgeId, { rateLow: next.low, rateHigh: next.high });
    },
    [edges, updateEdgeData],
  );

  // Keyboard deletion (Delete/Backspace) can remove several selected nodes/edges
  // at once; persist whatever React Flow leaves behind.
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const removed = new Set(deleted.map((n) => n.id));
      const nextNodes = nodes.filter((n) => !removed.has(n.id));
      const nextEdges = edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));
      emit(nextNodes, nextEdges);
    },
    [nodes, edges, emit],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const removed = new Set(deleted.map((e) => e.id));
      emit(nodes, edges.filter((e) => !removed.has(e.id)));
    },
    [nodes, edges, emit],
  );

  // Remove só a conexão; os cards dos dois lados ficam.
  const deleteConnection = useCallback(
    (edgeId: string) => {
      const nextEdges = edges.filter((e) => e.id !== edgeId);
      setEdges(nextEdges);
      emit(nodes, nextEdges);
    },
    [nodes, edges, setEdges, emit],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/funnel-node');
      if (!raw) return;
      const payload = JSON.parse(raw) as DragPayload;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = crypto.randomUUID();
      const nodeType = payload.type === 'funnelNode' && payload.category === 'page' ? 'pageNode' : payload.type;
      const newNode: Node = { id, type: nodeType, position, data: defaultDataForPayload(payload) };
      const next = [...nodes, newNode];
      setNodes(next);
      emit(next, edges);
    },
    [nodes, edges, screenToFlowPosition, setNodes, emit],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const startDrag = useCallback((event: DragEvent, payload: DragPayload) => {
    event.dataTransfer.setData('application/funnel-node', JSON.stringify(payload));
  }, []);

  const actions = useMemo(
    () => ({ updateNodeData, deleteNode, deleteConnection, updateEdgeData, setEdgeRate }),
    [updateNodeData, deleteNode, deleteConnection, updateEdgeData, setEdgeRate],
  );

  // ── Valores derivados ─────────────────────────────────────────────────
  // Os três cenários são calculados juntos: o que aparece nos cards é o do
  // cenário ativo, e o painel de previsão mostra os três lado a lado.
  const byScenario = useMemo(() => {
    const out = {} as Record<Scenario, { computed: ReturnType<typeof computeFunnelMetrics>; forecast: ReturnType<typeof computeForecastSummary> }>;
    for (const { id } of SCENARIOS) {
      const resolved = resolveScenario(nodes as unknown as { id: string; type?: string; data: Record<string, unknown> }[], edges, id);
      const c = computeFunnelMetrics(resolved.nodes as unknown as FunnelMapNode[], resolved.edges as FunnelMapEdge[]);
      out[id] = { computed: c, forecast: computeForecastSummary(resolved.nodes as unknown as FunnelMapNode[], c) };
    }
    return out;
  }, [nodes, edges]);
  const computed = byScenario[scenario].computed;
  const forecast = byScenario[scenario].forecast;
  const issues = useMemo(() => findIssues(nodes, edges), [nodes, edges]);
  const firstLeads = useMemo(() => firstLeadIds(nodes, edges), [nodes, edges]);
  const funnelChart = useMemo(() => buildFunnelStages(nodes, edges, computed), [nodes, edges, computed]);
  const selectedCount = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);

  const nodesWithComputed = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === 'funnelNode' || n.type === 'pageNode') {
          const c = computed.get(n.id);
          const incoming = c?.incoming?.map((i) => {
            const src = nodes.find((x) => x.id === i.sourceId);
            const d = src?.data as { label?: string; category?: FunnelNodeCategory; variant?: string } | undefined;
            const name = d?.label || (d?.category && d.variant ? findVariant(d.category, d.variant).label : '');
            return { ...i, sourceLabel: name };
          });
          return {
            ...n,
            data: {
              ...n.data,
              computed: c ? { ...c, incoming } : c,
              warning: issues.get(n.id),
              showCpl: firstLeads.has(n.id),
              scenario,
              // Os campos de edição só abrem com UM card selecionado.
              showFields: Boolean(n.selected) && selectedCount === 1,
            },
          };
        }
        if (n.type === 'funnelChartNode') return { ...n, data: { ...n.data, chart: funnelChart, scenario } };
        if (n.type === 'forecastNode') {
          return {
            ...n,
            data: {
              ...n.data,
              computed: forecast,
              scenario,
              scenarios: {
                low: byScenario.low.forecast,
                mid: byScenario.mid.forecast,
                high: byScenario.high.forecast,
                real: byScenario.real.forecast,
              },
            },
          };
        }
        return n;
      }),
    [nodes, computed, forecast, issues, selectedCount, scenario, byScenario, funnelChart, firstLeads],
  );

  // Cada card de funil tem UMA saída (direita) e UMA entrada (esquerda). Os
  // ids de ponto são definidos aqui, na hora de desenhar, e não vêm do dado
  // salvo: mapas antigos (com ids como "top"/"left" ou sem id) continuam
  // abrindo, e toda linha nova nasce já ligada nos pontos certos.
  const edgesWithComputed = useMemo(() => {
    const funnelLike = new Set(nodes.filter(isFunnelLike).map((n) => n.id));
    return edges.map((e) => ({
      ...e,
      sourceHandle: funnelLike.has(e.source) ? 'out' : null,
      targetHandle: funnelLike.has(e.target) ? 'in' : null,
      type: 'pathEdge',
      // Taxa do cenário ativo, pro selinho no meio da linha.
      data: { ...e.data, rate: rateFor(e.data as never, scenario) },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6829c0' },
    }));
  }, [edges, nodes, scenario]);

  latest.current = { nodes, edges };

  return (
    <div className="flex h-full w-full gap-3">
      <Palette onDragStart={startDrag} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {header}
        <div className="liquid-glass no-elevation flex min-h-0 flex-1 overflow-hidden rounded-2xl">
          <div className="relative min-w-0 flex-1" ref={wrapperRef} onDrop={onDrop} onDragOver={onDragOver}>
            <FunnelActionsContext.Provider value={actions}>
              <ReactFlow
                className="funnel-flow"
                nodes={nodesWithComputed}
                edges={edgesWithComputed}
                onNodesChange={handleNodesChange}
                onNodeDragStop={handleNodeDragStop}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                colorMode="dark"
                proOptions={{ hideAttribution: true }}
                connectionMode={ConnectionMode.Strict}
                defaultEdgeOptions={{ type: 'pathEdge', data: {} }}
                zoomOnDoubleClick={false}
                snapToGrid={snap}
                snapGrid={[GRID, GRID]}
                /* Figma-style: drag on empty canvas = selection box, hold Space to
                   pan, Shift/Ctrl-click to add to the selection. */
                selectionOnDrag
                panOnDrag={false}
                panActivationKeyCode="Space"
                selectionMode={SelectionMode.Partial}
                multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
                selectionKeyCode={null}
              >
                <Panel position="top-center">
                  <CanvasActions
                    canUndo={past.current.length > 0}
                    canRedo={future.current.length > 0}
                    snap={snap}
                    hasSelection={selectedCount > 0}
                    showAlign={selectedCount > 1}
                    scenario={scenario}
                    onScenario={setScenario}
                    onAlign={alignSelected}
                    onUndo={undo}
                    onRedo={redo}
                    onArrange={arrange}
                    onDuplicate={duplicate}
                    onToggleSnap={() => setSnap((v) => !v)}
                  />
                </Panel>
                <AlignGuides x={guides.x} y={guides.y} />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable maskColor="rgba(0,0,0,0.6)" />
                <Background variant={BackgroundVariant.Dots} gap={GRID} size={1.4} color="#2a2a30" />
              </ReactFlow>
            </FunnelActionsContext.Provider>

            {quickAdd && (
              <QuickAddMenu
                x={quickAdd.screenX}
                y={quickAdd.screenY}
                onPick={createFromQuickAdd}
                onClose={() => setQuickAdd(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FunnelCanvas(props: FunnelCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
