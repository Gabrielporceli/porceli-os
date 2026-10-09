import { Handle, Position } from '@xyflow/react';

/** Entrada à esquerda, saída à direita, ambas no meio da lateral. A linha
 *  sempre nasce da saída e termina na entrada.
 *
 *  Visual: uma barrinha fina colada na borda, só visível ao passar o mouse ou
 *  com o card selecionado. A área clicável do ponto é maior que a barra, pra
 *  não exigir pontaria. */
export function SideHandles({ color, selected }: { color: string; selected?: boolean }) {
  const barra = `pointer-events-none absolute left-1/2 top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover:opacity-100 ${
    selected ? 'opacity-100' : 'opacity-0'
  }`;
  const area = '!h-7 !w-3 !min-w-0 !rounded-none !border-0 !bg-transparent';

  return (
    <>
      <Handle id="in" type="target" position={Position.Left} title="Entrada" className={area}>
        <span className={barra} style={{ background: 'rgba(255,255,255,0.55)' }} />
      </Handle>
      <Handle id="out" type="source" position={Position.Right} title="Saída" className={area}>
        <span className={barra} style={{ background: '#8B5CF6' }} />
      </Handle>
    </>
  );
}
