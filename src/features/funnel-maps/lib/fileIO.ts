import type { FunnelMap } from '../types/funnel';

export function exportMapToFile(map: FunnelMap) {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${map.name.replace(/[^\w-]+/g, '_') || 'funil'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importMapFromFile(file: File): Promise<Pick<FunnelMap, 'name' | 'nodes' | 'edges'>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as FunnelMap;
        if (!parsed.nodes || !parsed.edges) throw new Error('Arquivo inválido');
        resolve({ name: parsed.name ?? 'Funil importado', nodes: parsed.nodes, edges: parsed.edges });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Falha ao importar arquivo'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsText(file);
  });
}
