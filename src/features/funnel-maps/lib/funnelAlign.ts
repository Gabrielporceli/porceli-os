import type { Node } from '@xyflow/react';

const SNAP_DIST = 8;
const FALLBACK_W = 160;
const FALLBACK_H = 120;

const sizeOf = (n: Node) => ({ w: n.measured?.width ?? FALLBACK_W, h: n.measured?.height ?? FALLBACK_H });

/**
 * Encaixe magnético durante o arrasto: se uma borda ou o centro do card
 * arrastado chega perto (≤ 8px) de uma borda ou centro de outro card, puxa o
 * card pra alinhar e devolve a posição da linha-guia.
 */
export function snapToOthers(
  id: string,
  pos: { x: number; y: number },
  all: Node[],
): { pos: { x: number; y: number }; guideX?: number; guideY?: number } {
  const me = all.find((n) => n.id === id);
  if (!me) return { pos };
  const { w, h } = sizeOf(me);
  const mine = { x: [pos.x, pos.x + w / 2, pos.x + w], y: [pos.y, pos.y + h / 2, pos.y + h] };

  let bestX: { d: number; line: number } | null = null;
  let bestY: { d: number; line: number } | null = null;

  for (const o of all) {
    if (o.id === id) continue;
    const s = sizeOf(o);
    const theirs = {
      x: [o.position.x, o.position.x + s.w / 2, o.position.x + s.w],
      y: [o.position.y, o.position.y + s.h / 2, o.position.y + s.h],
    };
    for (const a of mine.x) for (const b of theirs.x) {
      const d = b - a;
      if (Math.abs(d) <= SNAP_DIST && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, line: b };
    }
    for (const a of mine.y) for (const b of theirs.y) {
      const d = b - a;
      if (Math.abs(d) <= SNAP_DIST && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, line: b };
    }
  }

  return {
    pos: { x: pos.x + (bestX?.d ?? 0), y: pos.y + (bestY?.d ?? 0) },
    guideX: bestX?.line,
    guideY: bestY?.line,
  };
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'distribute-h' | 'distribute-v';

/** Alinha ou distribui os cards recebidos; devolve id → nova posição. */
export function alignNodes(selected: Node[], mode: AlignMode): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (selected.length < 2) return out;

  const boxes = selected.map((n) => ({ n, ...sizeOf(n) }));
  const minX = Math.min(...boxes.map((b) => b.n.position.x));
  const maxX = Math.max(...boxes.map((b) => b.n.position.x + b.w));
  const minY = Math.min(...boxes.map((b) => b.n.position.y));
  const maxY = Math.max(...boxes.map((b) => b.n.position.y + b.h));

  if (mode === 'distribute-h' || mode === 'distribute-v') {
    if (selected.length < 3) return out;
    const horizontal = mode === 'distribute-h';
    const sorted = [...boxes].sort((a, b) => (horizontal ? a.n.position.x - b.n.position.x : a.n.position.y - b.n.position.y));
    const total = sorted.reduce((s, b) => s + (horizontal ? b.w : b.h), 0);
    const span = horizontal ? maxX - minX : maxY - minY;
    const gap = (span - total) / (sorted.length - 1);
    let cursor = horizontal ? minX : minY;
    for (const b of sorted) {
      out.set(b.n.id, horizontal ? { x: cursor, y: b.n.position.y } : { x: b.n.position.x, y: cursor });
      cursor += (horizontal ? b.w : b.h) + gap;
    }
    return out;
  }

  for (const b of boxes) {
    const { x, y } = b.n.position;
    if (mode === 'left') out.set(b.n.id, { x: minX, y });
    else if (mode === 'right') out.set(b.n.id, { x: maxX - b.w, y });
    else if (mode === 'hcenter') out.set(b.n.id, { x: (minX + maxX) / 2 - b.w / 2, y });
    else if (mode === 'top') out.set(b.n.id, { x, y: minY });
    else if (mode === 'bottom') out.set(b.n.id, { x, y: maxY - b.h });
    else out.set(b.n.id, { x, y: (minY + maxY) / 2 - b.h / 2 });
  }
  return out;
}
