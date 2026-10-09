import type { Edge, Node } from '@xyflow/react';

/**
 * Problemas que o mapa deveria avisar em vez de calar:
 *  • passo (não-tráfego) sem nenhuma conexão de entrada: mostra 0 pessoas;
 *  • card dentro de um ciclo: as pessoas dão voltas e a conta fica errada.
 * Devolve nodeId → mensagem.
 */
export function findIssues(nodes: Node[], edges: Edge[]): Map<string, string> {
  const issues = new Map<string, string>();
  const flow = nodes.filter((n) => n.type === 'funnelNode' || n.type === 'pageNode');
  const ids = new Set(flow.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  const out = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const e of links) {
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
    hasIncoming.add(e.target);
  }

  const reaches = (from: string, goal: string): boolean => {
    const seen = new Set<string>();
    const stack = [...(out.get(from) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === goal) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(out.get(cur) ?? []));
    }
    return false;
  };

  for (const n of flow) {
    const category = (n.data as { category?: string }).category;
    if (reaches(n.id, n.id)) {
      issues.set(n.id, 'Este card está num ciclo: as pessoas dão voltas e os números ficam errados.');
    } else if (category !== 'traffic' && !hasIncoming.has(n.id)) {
      issues.set(n.id, 'Sem entrada: ligue um card a este passo, senão ele mostra 0 pessoas.');
    }
  }
  return issues;
}
