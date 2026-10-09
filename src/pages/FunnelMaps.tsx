import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { usePageReady } from '@/hooks/usePageReady';
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
  // `!activeMap` entra como "ainda carregando" porque no 1º acesso o mapa
  // inicial é criado logo após a query terminar — sem isso a página tentaria
  // desenhar a Toolbar sem mapa.
  const isReady = usePageReady(isLoading || !activeMap);

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

  // Mesma convenção das outras páginas: quem desenha o "carregando" é a
  // transição do layout (overlay de blur + logo), não a página. Antes esta
  // aqui era a única que tinha spinner próprio — e, como nunca montava o
  // PageLoader, nunca avisava a transição de que estava carregando: a
  // animação simplesmente não acontecia ao entrar nela.
  // O `!activeMap` também serve pro TypeScript: é ele que estreita o tipo
  // pro Toolbar/FunnelCanvas abaixo, que exigem um mapa de verdade.
  // Altura = espaço que sobra da janela abaixo do topo da página, em vez de um
  // valor fixo: as colunas ocupam a tela inteira em qualquer tamanho, sem
  // deixar vão embaixo nem criar rolagem na página.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState<number>();
  const [boxShift, setBoxShift] = useState(0);
  const ready = isReady && !!activeMap;
  useLayoutEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      // Já deslocado: mede de onde o bloco começaria sem o ajuste.
      const top = el.getBoundingClientRect().top + window.scrollY - (Number(el.dataset.shift) || 0);
      if (window.innerWidth >= 768) {
        // Desktop: as colunas ocupam a mesma faixa da barra lateral (16px do topo,
        // 16px do fundo), então a paleta fica do tamanho dela.
        setBoxShift(16 - top);
        setBoxHeight(Math.max(420, window.innerHeight - 16 - 16));
      } else {
        setBoxShift(0);
        setBoxHeight(Math.max(420, window.innerHeight - top - 24));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ready]);

  if (!isReady || !activeMap) return <PageLoader />;

  return (
    <div ref={boxRef} data-shift={boxShift} style={{ height: boxHeight ?? 'calc(100vh - 180px)', marginTop: boxShift }}>
      <FunnelCanvas
        key={activeMap.id}
        nodes={activeMap.nodes}
        edges={activeMap.edges}
        onChange={handleCanvasChange}
        header={
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
        }
      />
    </div>
  );
}
