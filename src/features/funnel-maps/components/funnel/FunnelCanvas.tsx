import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FunnelNode } from './nodes/FunnelNode';
import { PageNode } from './nodes/PageNode';
import { NoteNode } from './nodes/NoteNode';
import { ImageNode } from './nodes/ImageNode';
import { ForecastNode } from './nodes/ForecastNode';
import { RateNode } from './nodes/RateNode';
import { PathEdge } from './edges/PathEdge';
import { Palette, type DragPayload } from './Palette';
import { PropertiesPanel } from './PropertiesPanel';
import { QuickAddMenu } from './QuickAddMenu';
import { FunnelActionsContext } from './funnelContext';
import { computeFunnelMetrics, computeForecastSummary } from '../../lib/funnelMath';
import type { CanvasNodeType, FunnelMapEdge, FunnelMapNode, FunnelNodeCategory } from '../../types/funnel';

const nodeTypes = { funnelNode: FunnelNode, pageNode: PageNode, noteNode: NoteNode, imageNode: ImageNode, forecastNode: ForecastNode, rateNode: RateNode };
const edgeTypes = { pathEdge: PathEdge };

/** Nodes that represent a real funnel step — a connection between two of
 *  these always gets a RateNode auto-inserted in between. RateNode itself,
 *  and annotation nodes, are excluded so chains don't nest rate cards. */
function isFunnelLike(node: Node): boolean {
  return node.type === 'funnelNode' || node.type === 'pageNode';
}

function defaultDataForPayload(payload: DragPayload) {
  if (payload.type === 'noteNode') return { text: '' };
  if (payload.type === 'imageNode') return { src: null };
  if (payload.type === 'forecastNode') return {};
  const { category } = payload;
  const base = { category, variant: payload.variantId, label: '' };
  if (category === 'traffic') return { ...base, visitors: 500 };
  return base;
}

function makeRateNode(a: { x: number; y: number }, b: { x: number; y: number }): Node {
  return {
    id: crypto.randomUUID(),
    type: 'rateNode',
    position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    data: { rate: 100 },
  };
}

function pathEdge(source: string, target: string, extra?: Partial<Edge>): Edge {
  return { id: crypto.randomUUID(), source, target, type: 'pathEdge', data: {}, ...extra } as Edge;
}

interface QuickAddState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

interface FunnelCanvasProps {
  nodes: FunnelMapNode[];
  edges: FunnelMapEdge[];
  onChange: (patch: { nodes: FunnelMapNode[]; edges: FunnelMapEdge[] }) => void;
}

function CanvasInner({ nodes: initialNodes, edges: initialEdges, onChange }: FunnelCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      type: 'pathEdge',
      data: {},
    })) as Edge[],
  );
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);

  const emit = useCallback(
    (nds: Node[], eds: Edge[]) => {
      onChange({
        nodes: nds.map((n) => ({ id: n.id, type: (n.type ?? 'funnelNode') as CanvasNodeType, position: n.position, data: n.data }) as unknown as FunnelMapNode),
        edges: eds.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
        })),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (sourceNode && targetNode && isFunnelLike(sourceNode) && isFunnelLike(targetNode)) {
        // Two real funnel cards connected directly: insert the Taxa/Pessoas
        // connector card between them instead of a bare line.
        const rate = makeRateNode(sourceNode.position, targetNode.position);
        const e1 = pathEdge(params.source, rate.id, { sourceHandle: params.sourceHandle });
        const e2 = pathEdge(rate.id, params.target, { targetHandle: params.targetHandle });
        const nextNodes = [...nodes, rate];
        const nextEdges = [...edges, e1, e2];
        setNodes(nextNodes);
        setEdges(nextEdges);
        emit(nextNodes, nextEdges);
        return;
      }

      const next = addEdge({ ...params, type: 'pathEdge', data: {} } as Edge, edges);
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setNodes, setEdges, emit],
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

      const sourceNode = nodes.find((n) => n.id === quickAdd.sourceId);
      let nextNodes: Node[];
      let nextEdges: Edge[];

      if (sourceNode && isFunnelLike(sourceNode)) {
        const rate = makeRateNode(sourceNode.position, position);
        nextNodes = [...nodes, rate, newNode];
        nextEdges = [...edges, pathEdge(quickAdd.sourceId, rate.id), pathEdge(rate.id, id)];
      } else {
        nextNodes = [...nodes, newNode];
        nextEdges = [...edges, pathEdge(quickAdd.sourceId, id)];
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      emit(nextNodes, nextEdges);
      setQuickAdd(null);
    },
    [quickAdd, nodes, edges, screenToFlowPosition, setNodes, setEdges, emit],
  );

  const handleNodeDragStop = useCallback(() => emit(nodes, edges), [emit, nodes, edges]);

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

  const updateEdgeStyleForNode = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      const next = edges.map((e) => (e.source === nodeId || e.target === nodeId ? { ...e, data: { ...e.data, ...patch } } : e));
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setEdges, emit],
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
    () => ({ updateNodeData, deleteNode, updateEdgeData, updateEdgeStyleForNode }),
    [updateNodeData, deleteNode, updateEdgeData, updateEdgeStyleForNode],
  );

  const computed = useMemo(
    () => computeFunnelMetrics(nodes as unknown as FunnelMapNode[], edges as unknown as FunnelMapEdge[]),
    [nodes, edges],
  );

  const forecast = useMemo(() => computeForecastSummary(nodes as unknown as FunnelMapNode[], computed), [nodes, computed]);

  const nodesWithComputed = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === 'funnelNode' || n.type === 'pageNode' || n.type === 'rateNode') return { ...n, data: { ...n.data, computed: computed.get(n.id) } };
        if (n.type === 'forecastNode') return { ...n, data: { ...n.data, computed: forecast } };
        return n;
      }),
    [nodes, computed, forecast],
  );

  const edgesWithComputed = useMemo(
    () => edges.map((e) => ({ ...e, type: 'pathEdge', markerEnd: { type: MarkerType.ArrowClosed, color: '#6829c0' } })),
    [edges],
  );

  // The right-hand properties panel edits one funnel/page card at a time.
  const selectedFunnelNode = useMemo(() => {
    const selected = nodesWithComputed.filter((n) => n.selected && (n.type === 'funnelNode' || n.type === 'pageNode'));
    return selected.length === 1 ? selected[0] : null;
  }, [nodesWithComputed]);

  return (
    <div className="flex h-full w-full">
      <Palette onDragStart={startDrag} />

      <div className="relative flex-1" ref={wrapperRef} onDrop={onDrop} onDragOver={onDragOver}>
        <FunnelActionsContext.Provider value={actions}>
          <ReactFlow
            nodes={nodesWithComputed}
            edges={edgesWithComputed}
            onNodesChange={onNodesChange}
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
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'pathEdge', data: {} }}
            /* Figma-style: drag on empty canvas = selection box, hold Space to
               pan, Shift/Ctrl-click to add to the selection. */
            selectionOnDrag
            panOnDrag={false}
            panActivationKeyCode="Space"
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            selectionKeyCode={null}
          >
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-porceli-gray-900" maskColor="rgba(0,0,0,0.6)" />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="#2a2a30" />
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

      {selectedFunnelNode && (
        <PropertiesPanel node={selectedFunnelNode} onUpdate={updateNodeData} onDelete={deleteNode} />
      )}
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
