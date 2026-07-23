import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FunnelCanvas } from '@/features/funnel-maps/components/funnel/FunnelCanvas';
import { Toolbar } from '@/features/funnel-maps/components/funnel/Toolbar';
import { useFunnelMaps } from '@/features/funnel-maps/hooks/useFunnelMaps';
import { exportMapToFile, importMapFromFile } from '@/features/funnel-maps/lib/fileIO';
import type { FunnelMapEdge, FunnelMapNode } from '@/features/funnel-maps/types/funnel';

const SEED_NODE: FunnelMapNode = {
  id: crypto.randomUUID(),
  type: 'funnelNode',
  position: { x: 80, y: 200 },
  data: { category: 'traffic', variant: 'facebook-ads', label: 'Tráfego pago', visitors: 1000 },
};

export default function FunnelMaps() {
  const { maps, isLoading, createMap, updateMap, deleteMap } = useFunnelMaps();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // First load: pick the most recently updated map, or create one if none exist.
  useEffect(() => {
    if (isLoading || initialized.current) return;
    initialized.current = true;
    if (maps.length === 0) {
      createMap('Meu primeiro funil', { nodes: [SEED_NODE], edges: [] }).then((m) => setActiveId(m.id));
    } else {
      setActiveId(maps[0].id);
    }
  }, [isLoading, maps, createMap]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const activeMap = maps.find((m) => m.id === activeId) ?? null;

  const persist = useCallback(
    (id: string, patch: Partial<{ name: string; nodes: FunnelMapNode[]; edges: FunnelMapEdge[] }>) => {
      setSaved(false);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await updateMap(id, patch);
        } finally {
          setSaved(true);
        }
      }, 500);
    },
    [updateMap],
  );

  const handleCanvasChange = useCallback(
    (patch: { nodes: FunnelMapNode[]; edges: FunnelMapEdge[] }) => {
      if (activeMap) persist(activeMap.id, patch);
    },
    [activeMap, persist],
  );

  const handleRename = useCallback(
    (name: string) => {
      if (activeMap) persist(activeMap.id, { name });
    },
    [activeMap, persist],
  );

  const handleSwitch = useCallback((id: string) => setActiveId(id), []);

  const handleNew = useCallback(async () => {
    const created = await createMap(`Funil ${new Date().toLocaleDateString('pt-BR')}`, { nodes: [SEED_NODE], edges: [] });
    setActiveId(created.id);
  }, [createMap]);

  const handleDelete = useCallback(async () => {
    if (!activeMap || maps.length <= 1) return;
    await deleteMap(activeMap.id);
    setActiveId(maps.find((m) => m.id !== activeMap.id)?.id ?? null);
  }, [activeMap, maps, deleteMap]);

  const handleExport = useCallback(() => {
    if (activeMap) exportMapToFile(activeMap);
  }, [activeMap]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const imported = await importMapFromFile(file);
        const created = await createMap(imported.name, { nodes: imported.nodes, edges: imported.edges });
        setActiveId(created.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Falha ao importar arquivo.');
      }
    },
    [createMap],
  );

  if (isLoading || !activeMap) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-porceli-gray-400">
        <Loader2 size={16} className="animate-spin" /> Carregando mapas de funil…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-2xl border border-white/5">
      <Toolbar
        map={activeMap}
        maps={maps}
        saved={saved}
        onRename={handleRename}
        onSwitch={handleSwitch}
        onNew={handleNew}
        onDelete={handleDelete}
        onExport={handleExport}
        onImport={handleImport}
      />
      <div className="min-h-0 flex-1">
        <FunnelCanvas key={activeMap.id} nodes={activeMap.nodes} edges={activeMap.edges} onChange={handleCanvasChange} />
      </div>
    </div>
  );
}
