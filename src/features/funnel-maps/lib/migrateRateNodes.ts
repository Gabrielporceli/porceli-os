import type { FunnelMapEdge, FunnelMapNode, RateNodeData } from '../types/funnel';

/**
 * Converte mapas antigos, em que a taxa morava num cartão "Taxa/Pessoas"
 * (nó `rateNode`) entre dois cards, para o modelo atual, em que a taxa fica
 * na própria conexão.
 *
 * Cada par (origem → cartão de taxa → destino) vira uma conexão direta
 * origem → destino com a taxa do cartão. A conta de pessoas dá o mesmo
 * resultado. Cartões de taxa sem entrada ou sem saída são descartados.
 * Mapas já no modelo novo passam sem mudança.
 */
export function migrateRateNodes(
  nodes: FunnelMapNode[],
  edges: FunnelMapEdge[],
): { nodes: FunnelMapNode[]; edges: FunnelMapEdge[] } {
  const rateNodes = nodes.filter((n) => (n.type as string) === 'rateNode');
  if (rateNodes.length === 0) return { nodes, edges };

  const rateIds = new Set(rateNodes.map((n) => n.id));
  const nextEdges: FunnelMapEdge[] = edges.filter((e) => !rateIds.has(e.source) && !rateIds.has(e.target));

  for (const rate of rateNodes) {
    const data = rate.data as RateNodeData;
    const ins = edges.filter((e) => e.target === rate.id && !rateIds.has(e.source));
    const outs = edges.filter((e) => e.source === rate.id && !rateIds.has(e.target));
    for (const a of ins) {
      for (const b of outs) {
        nextEdges.push({
          id: crypto.randomUUID(),
          source: a.source,
          target: b.target,
          rate: data.rate ?? 100,
          curve: data.curve,
          dashed: data.dashed,
        });
      }
    }
  }

  return { nodes: nodes.filter((n) => !rateIds.has(n.id)), edges: nextEdges };
}
