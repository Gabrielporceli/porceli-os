import type { FunnelIncoming, FunnelMapEdge, FunnelMapNode, FunnelNodeComputed, FunnelNodeData } from '../types/funnel';

function isFlowNode(node: FunnelMapNode): node is FunnelMapNode & { data: FunnelNodeData } {
  return node.type === 'funnelNode' || node.type === 'pageNode';
}

export type FunnelComputedResult = Map<string, FunnelNodeComputed>;

/**
 * Simulates people/revenue flow through the funnel graph.
 *
 * Model: a conversion rate lives on each connection (edge). The people that
 * arrive at a card are the sum, over its incoming connections, of the
 * source's people times that connection's rate. A card can branch into
 * several targets (each connection with its own rate) and receive from
 * several sources. Each card lists its incoming connections in `incoming`.
 * Traffic cards originate people (`visitors`) and ignore incoming ones.
 * Note/Image/Forecast nodes are annotations only and excluded from the flow.
 */
export function computeFunnelMetrics(nodes: FunnelMapNode[], edges: FunnelMapEdge[]): FunnelComputedResult {
  const result = new Map<string, FunnelNodeComputed>();

  const flowNodes = nodes.filter(isFlowNode);
  const flowIds = new Set(flowNodes.map((n) => n.id));
  const relevantEdges = edges.filter((e) => flowIds.has(e.source) && flowIds.has(e.target));

  const incomingEdges = new Map<string, FunnelMapEdge[]>();
  const outgoingEdges = new Map<string, FunnelMapEdge[]>();
  const inDegree = new Map<string, number>();

  for (const node of flowNodes) {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of relevantEdges) {
    incomingEdges.get(edge.target)!.push(edge);
    outgoingEdges.get(edge.source)!.push(edge);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's algorithm for topological order; cycles are broken by processing
  // remaining nodes in original order once the queue drains.
  const queue = flowNodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  const visited = new Set<string>();
  const remainingInDegree = new Map(inDegree);

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    for (const edge of outgoingEdges.get(id) ?? []) {
      const next = (remainingInDegree.get(edge.target) ?? 0) - 1;
      remainingInDegree.set(edge.target, next);
      if (next <= 0 && !visited.has(edge.target)) queue.push(edge.target);
    }
  }
  for (const node of flowNodes) {
    if (!visited.has(node.id)) order.push(node.id);
  }

  const nodesById = new Map(flowNodes.map((n) => [n.id, n]));

  for (const id of order) {
    const node = nodesById.get(id);
    if (!node) continue;

    const incoming: FunnelIncoming[] = (incomingEdges.get(id) ?? []).map((edge) => {
      const rate = clampRate(edge.rate ?? 100);
      return {
        edgeId: edge.id,
        sourceId: edge.source,
        rate,
        people: Math.round((result.get(edge.source)?.people ?? 0) * (rate / 100)),
      };
    });
    const incomingPeople = incoming.reduce((sum, i) => sum + i.people, 0);

    let people: number;
    const computed: FunnelNodeComputed = { people: 0 };

    if ((node.data as FunnelNodeData).category === 'traffic') {
      people = Math.max(0, Math.round((node.data as FunnelNodeData).visitors ?? 0));
    } else {
      computed.incoming = incoming;
      people = incomingPeople;
      const avgTicket = (node.data as FunnelNodeData).avgTicket ?? 0;
      if (avgTicket > 0) computed.revenue = people * avgTicket;
    }

    computed.people = people;
    const cost = (node.data as FunnelNodeData).cost ?? 0;
    // Custo por visita (traffic) / custo por lead (conversion steps).
    if (cost > 0 && people > 0) computed.costPerPerson = cost / people;
    result.set(id, computed);
  }

  // Custo acumulado: o gasto de todos os cards que levam até cada passo (cada
  // um contado uma vez, mesmo com caminhos que se cruzam). É o custo real de
  // chegar ali — o CPL/CAC de verdade, e não só o gasto do próprio card.
  for (const node of flowNodes) {
    const seen = new Set<string>();
    const stack = [node.id];
    let total = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      total += (nodesById.get(cur)?.data as FunnelNodeData | undefined)?.cost ?? 0;
      for (const edge of incomingEdges.get(cur) ?? []) stack.push(edge.source);
    }

    const computed = result.get(node.id);
    if (!computed) continue;
    computed.accumulatedCost = total;
    if (total > 0 && computed.people > 0) computed.accumulatedPerPerson = total / computed.people;

    const data = node.data as FunnelNodeData;
    const ticket = data.avgTicket ?? 0;
    if (ticket > 0 && computed.revenue !== undefined) {
      const margin = (data.margin ?? 100) / 100;
      computed.profit = computed.revenue * margin - total;
      computed.maxCac = ticket * margin;
    }
  }

  return result;
}

function clampRate(rate: number): number {
  if (Number.isNaN(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export interface ForecastSummary {
  people: number;
  /** People reaching revenue-goal nodes (nodes with avgTicket > 0). */
  leads: number;
  revenue: number;
  expenses: number;
  profit: number;
  /** Total expenses / leads — custo por lead. */
  cpl: number | null;
  roi: number | null;
}

/** Aggregates the whole map into the KPIs shown by the Forecast widget. */
export function computeForecastSummary(nodes: FunnelMapNode[], result: FunnelComputedResult): ForecastSummary {
  let people = 0;
  let leads = 0;
  let revenue = 0;
  let grossProfit = 0;
  let expenses = 0;

  for (const node of nodes) {
    if (node.type !== 'funnelNode' && node.type !== 'pageNode') continue;
    const data = node.data as FunnelNodeData;
    const computed = result.get(node.id);
    if (data.category === 'traffic') people += computed?.people ?? 0;
    if ((data.avgTicket ?? 0) > 0) leads += computed?.people ?? 0;
    revenue += computed?.revenue ?? 0;
    // Lucro bruto considera a margem de cada passo de conversão (vazia = 100%).
    grossProfit += (computed?.revenue ?? 0) * ((data.margin ?? 100) / 100);
    expenses += data.cost ?? 0;
  }

  const profit = grossProfit - expenses;
  const cpl = expenses > 0 && leads > 0 ? expenses / leads : null;
  const roi = expenses > 0 ? revenue / expenses : null;
  return { people, leads, revenue, expenses, profit, cpl, roi };
}
