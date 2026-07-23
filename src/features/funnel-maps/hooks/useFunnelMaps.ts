import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FunnelMap, FunnelMapEdge, FunnelMapNode } from '../types/funnel';

interface FunnelMapRow {
  id: string;
  user_id: string;
  name: string;
  nodes: unknown;
  edges: unknown;
  created_at: string;
  updated_at: string;
}

function rowToMap(row: FunnelMapRow): FunnelMap {
  return {
    id: row.id,
    name: row.name,
    nodes: (row.nodes as FunnelMapNode[]) ?? [],
    edges: (row.edges as FunnelMapEdge[]) ?? [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/** Supabase-backed replacement for the standalone app's localStorage —
 *  funnel maps are now rows in `funnel_maps`, scoped to the logged-in user
 *  via RLS, matching the rest of the CRM's data hooks (useTags, useClients). */
export function useFunnelMaps() {
  const [maps, setMaps] = useState<FunnelMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMaps = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('funnel_maps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMaps((data ?? []).map(rowToMap));
    } catch (error) {
      console.error('Erro ao carregar mapas de funil:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os mapas de funil', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createMap = useCallback(
    async (name: string, seed?: { nodes?: FunnelMapNode[]; edges?: FunnelMapEdge[] }): Promise<FunnelMap> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('funnel_maps')
        .insert({
          user_id: user.id,
          name,
          nodes: (seed?.nodes ?? []) as unknown as never,
          edges: (seed?.edges ?? []) as unknown as never,
        })
        .select()
        .single();

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível criar o mapa', variant: 'destructive' });
        throw error;
      }
      const created = rowToMap(data);
      setMaps((prev) => [created, ...prev]);
      return created;
    },
    [toast],
  );

  const updateMap = useCallback(async (id: string, patch: Partial<Pick<FunnelMap, 'name' | 'nodes' | 'edges'>>) => {
    const { error } = await supabase
      .from('funnel_maps')
      .update(patch as never)
      .eq('id', id);

    if (error) {
      console.error('Erro ao salvar mapa de funil:', error);
      throw error;
    }
    setMaps((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)));
  }, []);

  const deleteMap = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('funnel_maps').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir o mapa', variant: 'destructive' });
        throw error;
      }
      setMaps((prev) => prev.filter((m) => m.id !== id));
    },
    [toast],
  );

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  return { maps, isLoading, createMap, updateMap, deleteMap, refetch: fetchMaps };
}
