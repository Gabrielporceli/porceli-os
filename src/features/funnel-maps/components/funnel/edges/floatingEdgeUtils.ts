import { Position, type InternalNode, type Node } from '@xyflow/react';

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function nodeCenter(node: InternalNode<Node>) {
  return {
    x: node.internals.positionAbsolute.x + (node.measured.width ?? 0) / 2,
    y: node.internals.positionAbsolute.y + (node.measured.height ?? 0) / 2,
  };
}

/** The exact center point of each of a card's 4 fixed handles — the same
 *  spot the visual dot renders at, not a freely computed border crossing. */
function handleCenters(node: InternalNode<Node>) {
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;
  const w = node.measured.width ?? 0;
  const h = node.measured.height ?? 0;
  return {
    [Position.Top]: { x: x + w / 2, y },
    [Position.Right]: { x: x + w, y: y + h / 2 },
    [Position.Bottom]: { x: x + w / 2, y: y + h },
    [Position.Left]: { x, y: y + h / 2 },
  } as Record<Position, { x: number; y: number }>;
}

/** Snaps to whichever of a card's 4 fixed handles sits closest to `toward` —
 *  the line always touches one of those dots, never a point drifting along
 *  the edge, so the connection reads as "one of the 3-4 nearest points"
 *  rather than an arbitrary spot on the border. */
function nearestHandle(node: InternalNode<Node>, toward: { x: number; y: number }) {
  const centers = handleCenters(node);
  let best = SIDES[0];
  let bestDist = Infinity;
  for (const side of SIDES) {
    const c = centers[side];
    const dist = (c.x - toward.x) ** 2 + (c.y - toward.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = side;
    }
  }
  return { position: best, point: centers[best] };
}

/** Fixed-handle attachment points for a floating edge between two nodes. */
export function getEdgeParams(source: InternalNode<Node>, target: InternalNode<Node>) {
  const sourceHandle = nearestHandle(source, nodeCenter(target));
  const targetHandle = nearestHandle(target, nodeCenter(source));
  return {
    sx: sourceHandle.point.x,
    sy: sourceHandle.point.y,
    tx: targetHandle.point.x,
    ty: targetHandle.point.y,
    sourcePos: sourceHandle.position,
    targetPos: targetHandle.position,
  };
}
