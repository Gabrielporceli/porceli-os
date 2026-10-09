import { ViewportPortal, useViewport } from '@xyflow/react';

/** Linhas-guia que aparecem enquanto um card é arrastado e encosta no
 *  alinhamento de outro (bordas ou centro). Desenhadas em coordenadas do
 *  mapa; a espessura é dividida pelo zoom pra continuar fina na tela. */
export function AlignGuides({ x, y }: { x?: number; y?: number }) {
  const { zoom } = useViewport();
  if (x === undefined && y === undefined) return null;
  const thickness = 1.5 / zoom;
  const color = 'rgba(167, 139, 250, 0.95)';

  return (
    <ViewportPortal>
      {x !== undefined && (
        <div
          style={{ position: 'absolute', left: x - thickness / 2, top: -50000, width: thickness, height: 100000, background: color, pointerEvents: 'none' }}
        />
      )}
      {y !== undefined && (
        <div
          style={{ position: 'absolute', top: y - thickness / 2, left: -50000, height: thickness, width: 100000, background: color, pointerEvents: 'none' }}
        />
      )}
    </ViewportPortal>
  );
}
