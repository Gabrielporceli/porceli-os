import { BaseEdge, getBezierPath, getStraightPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './floatingEdgeUtils';

interface PathEdgeData {
  curve?: 'bezier' | 'straight';
  dashed?: boolean;
  [key: string]: unknown;
}

/** A plain connector line between two cards — no label, no rate. Style
 *  (curved/straight, solid/dashed) is set from the RateNode sitting between
 *  the two cards it links and mirrored onto both of that node's edges. Uses
 *  floating attachment so it always leaves/enters through whichever borders
 *  are closest, keeping paths short instead of tangling. */
export function PathEdge(props: EdgeProps) {
  const { id, source, target, style, markerEnd, selected } = props;
  const data = props.data as PathEdgeData | undefined;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode?.measured?.width || !targetNode?.measured?.width) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const curve = data?.curve ?? 'bezier';
  const dashed = data?.dashed ?? false;
  const pathArgs = { sourceX: sx, sourceY: sy, sourcePosition: sourcePos, targetX: tx, targetY: ty, targetPosition: targetPos };
  const [edgePath] = curve === 'straight' ? getStraightPath(pathArgs) : getBezierPath(pathArgs);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{ ...style, strokeWidth: selected ? 2.5 : 2, strokeDasharray: dashed ? '6 5' : undefined }}
    />
  );
}
