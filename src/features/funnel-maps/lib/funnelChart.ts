import type { Edge, Node } from '@xyflow/react';
import { findVariant, type FunnelNodeCategory, type FunnelNodeComputed } from '../types/funnel';
import { computeLevels } from './funnelLayout';

export interface FunnelStage {
  /** Nomes dos cards desta etapa (mais de um no topo, com várias fontes de tráfego). */
  names: string[];
  /** Pessoas que chegam a esta etapa, somando TODOS os caminhos do mapa. */
  people: number;
  /** Receita do passo; só na etapa final, quando ela é uma venda. */
  revenue: number;
  /** Pessoas desta etapa ÷ pessoas da etapa anterior. Vazio na primeira. */
  fromPrevious?: number;
  /** Pessoas desta etapa ÷ pessoas da primeira. */
  shareOfTop: number;
}

export interface FunnelChartData {
  stages: FunnelStage[];
  /** Todas as vendas (todos os caminhos) e todas as visitas do mapa. */
  totalSales?: number;
  totalVisits: number;
}

const nameOf = (n: Node): string => {
  const d = n.data as { label?: string; category?: FunnelNodeCategory; variant?: string };
  return d.label?.trim() || (d.category && d.variant ? findVariant(d.category, d.variant).label : 'Card');
};

/**
 * Monta o funil pelo CAMINHO PRINCIPAL até a venda, e não por colunas do mapa.
 *
 * Por colunas o gráfico mentia: um card que recebe a maior parte das pessoas
 * direto de um passo anterior (um atalho) caía numa coluna mais à frente, e o
 * funil "alargava" no fim. Aqui, partindo da venda e voltando, cada etapa é o
 * card que MAIS alimenta a seguinte.
 *
 * Os números são os REAIS de cada card, somando todos os caminhos: o topo é o
 * total de visitas de todas as fontes de tráfego, e a última etapa é o total
 * de vendas do passo (o mesmo que o mapa mostra nele). Assim o gráfico fecha
 * com as vendas do funil de verdade. Segue o cenário ativo, porque recebe os
 * números já calculados.
 *
 * Meta = o passo de venda (com ticket) de maior volume; sem vendas, o card
 * mais ao fim do fluxo.
 */
export function buildFunnelStages(
  nodes: Node[],
  edges: Edge[],
  computed: Map<string, FunnelNodeComputed>,
): FunnelChartData {
  const flow = nodes.filter((n) => n.type === 'funnelNode' || n.type === 'pageNode');
  const empty: FunnelChartData = { stages: [], totalVisits: 0 };
  if (flow.length === 0) return empty;

  const byId = new Map(flow.map((n) => [n.id, n]));
  const isTraffic = (n: Node) => (n.data as { category?: string }).category === 'traffic';
  const people = (n: Node) => computed.get(n.id)?.people ?? 0;

  const totalVisits = flow.filter(isTraffic).reduce((s, n) => s + people(n), 0);
  const sales = flow.filter((n) => computed.get(n.id)?.revenue !== undefined);
  const totalSales = sales.length > 0 ? sales.reduce((s, n) => s + people(n), 0) : undefined;

  let goal: Node;
  if (sales.length > 0) {
    goal = [...sales].sort((a, b) => people(b) - people(a))[0];
  } else {
    const links = edges.filter((e) => byId.has(e.source) && byId.has(e.target));
    const level = computeLevels(flow.map((n) => n.id), links);
    goal = [...flow].sort((a, b) => (level.get(b.id) ?? 0) - (level.get(a.id) ?? 0) || people(b) - people(a))[0];
  }

  // De trás pra frente: cada etapa é o card que mais alimenta a seguinte,
  // até chegar numa fonte de tráfego (ou num card sem entrada).
  const chain: Node[] = [];
  const seen = new Set<string>();
  let current: Node | undefined = goal;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (isTraffic(current)) break;
    chain.push(current);
    const best: { sourceId: string; people: number } | undefined = [...(computed.get(current.id)?.incoming ?? [])].sort(
      (a, b) => b.people - a.people,
    )[0];
    current = best ? byId.get(best.sourceId) : undefined;
  }
  chain.reverse();

  // Topo: TODAS as fontes de tráfego do mapa, somadas.
  const trafficNodes = flow.filter(isTraffic).sort((a, b) => a.position.y - b.position.y);
  const stageGroups: Node[][] = [];
  if (trafficNodes.length > 0) stageGroups.push(trafficNodes);
  chain.forEach((n) => stageGroups.push([n]));

  const sum = (group: Node[]) => group.reduce((t, n) => t + people(n), 0);
  const top = stageGroups[0] ? sum(stageGroups[0]) : 0;
  const stages: FunnelStage[] = stageGroups.map((group, i) => {
    const total = sum(group);
    const prev = i > 0 ? sum(stageGroups[i - 1]) : 0;
    return {
      names: group.map(nameOf),
      people: total,
      revenue: i === stageGroups.length - 1 ? computed.get(goal.id)?.revenue ?? 0 : 0,
      shareOfTop: top > 0 ? total / top : 0,
      fromPrevious: i > 0 && prev > 0 ? total / prev : undefined,
    };
  });

  return { stages, totalSales, totalVisits };
}
