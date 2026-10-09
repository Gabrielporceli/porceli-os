import type { Edge, Node } from '@xyflow/react';

const isFlow = (n: Node) => n.type === 'funnelNode' || n.type === 'pageNode';

const COL_W = 300;
const ROW_H = 210;
const X0 = 60;
const Y0 = 60;

/** Coluna de cada card: o caminho mais longo até ele a partir de uma fonte.
 *  Relaxamento limitado a N passadas: ciclos não travam, só param de subir. */
export function computeLevels(ids: string[], links: { source: string; target: string }[]): Map<string, number> {
  const level = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of links) {
      const next = (level.get(e.source) ?? 0) + 1;
      if (next > (level.get(e.target) ?? 0) && next < ids.length) {
        level.set(e.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

/**
 * Arruma os cards em colunas da esquerda para a direita: a coluna de um card
 * é o caminho mais longo até ele a partir de uma fonte. Dentro da coluna,
 * mantém a ordem vertical atual, só uniformizando o espaço. Notas, imagens e
 * o painel de previsão não mexem de lugar.
 */
export function arrangeNodes(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const flow = nodes.filter(isFlow);
  const ids = new Set(flow.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  const level = computeLevels(flow.map((n) => n.id), links);

  const columns = new Map<number, Node[]>();
  for (const n of flow) {
    const l = level.get(n.id) ?? 0;
    columns.set(l, [...(columns.get(l) ?? []), n]);
  }
  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));

  const out = new Map<string, { x: number; y: number }>();
  for (const [l, col] of columns) {
    col.sort((a, b) => a.position.y - b.position.y);
    const offset = ((tallest - col.length) * ROW_H) / 2;
    col.forEach((n, i) => out.set(n.id, { x: X0 + l * COL_W, y: Y0 + offset + i * ROW_H }));
  }
  return out;
}
