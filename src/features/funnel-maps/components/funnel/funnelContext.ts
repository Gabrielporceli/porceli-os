import { createContext, useContext } from 'react';
import type { Scenario } from '../../lib/scenarios';

interface FunnelActions {
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  /** Remove só a conexão (linha); os cards dos dois lados ficam. */
  deleteConnection: (edgeId: string) => void;
  updateEdgeData: (id: string, patch: Record<string, unknown>) => void;
  /** Define a taxa de uma conexão no cenário ativo (ajusta o outro limite se preciso). */
  setEdgeRate: (edgeId: string, scenario: Scenario, value: number) => void;
}

export const FunnelActionsContext = createContext<FunnelActions | null>(null);

export function useFunnelActions(): FunnelActions {
  const ctx = useContext(FunnelActionsContext);
  if (!ctx) throw new Error('useFunnelActions must be used inside FunnelActionsContext');
  return ctx;
}
