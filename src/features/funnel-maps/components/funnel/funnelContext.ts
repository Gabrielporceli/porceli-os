import { createContext, useContext } from 'react';

interface FunnelActions {
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  updateEdgeData: (id: string, patch: Record<string, unknown>) => void;
  /** Applies a style patch (curve/dashed) to every edge touching this node —
   *  used by RateNode so both line segments it connects stay in sync. */
  updateEdgeStyleForNode: (nodeId: string, patch: Record<string, unknown>) => void;
}

export const FunnelActionsContext = createContext<FunnelActions | null>(null);

export function useFunnelActions(): FunnelActions {
  const ctx = useContext(FunnelActionsContext);
  if (!ctx) throw new Error('useFunnelActions must be used inside FunnelActionsContext');
  return ctx;
}
