import type { FunnelMapEdge, FunnelMapNode, FunnelNodeComputed, FunnelNodeData, RateNodeData } from '../types/funnel';

function isFlowNode(node: FunnelMapNode): node is FunnelMapNode & { data: FunnelNodeData | RateNodeData } {
  return node.type === 'funnelNode' || node.type === 'pageNode' || node.type === 'rateNode';
}

export type FunnelComputedResult = Map<string, FunnelNodeComputed>;

/**
 * Simulates people/revenue flow through the funnel graph.
 *
 * Model: conversion rate lives on the `rateNode` — the Taxa/Pessoas card the
 * user drags between two funnel cards — not on the edge or on the funnel
 * node itself. Regular edges just forward 100% of the source's `people`
 * unchanged; a `rateNode` is the only place that multiplies by a rate. This
 * mirrors the reference product's "connector card" and, since a rateNode can
 * branch into multiple targets or a funnel node can have several incoming
 * rateNodes, naturally supports fan-out/fan-in funnels.
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

    const incoming = (incomingEdges.get(id) ?? []).reduce((sum, edge) => sum + (result.get(edge.source)?.people ?? 0), 0);

    let people: number;
    const computed: FunnelNodeComputed = { people: 0 };

    if (node.type === 'rateNode') {
      const rate = clampRate((node.data as RateNodeData).rate ?? 100);
      people = Math.round(incoming * (rate / 100));
    } else if ((node.data as FunnelNodeData).category === 'traffic') {
      people = Math.max(0, Math.round((node.data as FunnelNodeData).visitors ?? 0));
    } else {
      people = incoming;
      const avgTicket = (node.data as FunnelNodeData).avgTicket ?? 0;
      if (avgTicket > 0) computed.revenue = people * avgTicket;
    }

    computed.people = people;
    if (node.type !== 'rateNode') {
      const cost = (node.data as FunnelNodeData).cost ?? 0;
      // Custo por visita (traffic) / custo por lead (conversion steps).
      if (cost > 0 && people > 0) computed.costPerPerson = cost / people;
    }
    result.set(id, computed);
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
  let expenses = 0;

  for (const node of nodes) {
    if (node.type === 'rateNode' || node.type === 'noteNode' || node.type === 'imageNode' || node.type === 'forecastNode') continue;
    const data = node.data as FunnelNodeData;
    const computed = result.get(node.id);
    if (data.category === 'traffic') people += computed?.people ?? 0;
    if ((data.avgTicket ?? 0) > 0) leads += computed?.people ?? 0;
    revenue += computed?.revenue ?? 0;
    expenses += data.cost ?? 0;
  }

  const profit = revenue - expenses;
  const cpl = expenses > 0 && leads > 0 ? expenses / leads : null;
  const roi = expenses > 0 ? revenue / expenses : null;
  return { people, leads, revenue, expenses, profit, cpl, roi };
}
