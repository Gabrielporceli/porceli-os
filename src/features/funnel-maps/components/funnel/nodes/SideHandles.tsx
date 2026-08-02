import { Handle, Position } from '@xyflow/react';

const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const;

/** Four connection points, one per card side. With ConnectionMode.Loose each
 *  can act as source or target, so the arrow direction (not the handle type)
 *  decides the flow. Hidden by default; they appear on node hover or when the
 *  card is selected — matching the reference, where you just hover to move the
 *  card and click to reveal the connectors. */
export function SideHandles({ color, selected }: { color: string; selected?: boolean }) {
  return (
    <>
      {SIDES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          className={`!h-3 !w-3 !border-2 !border-white !transition-opacity group-hover:!opacity-100 ${
            selected ? '!opacity-100' : '!opacity-0'
          }`}
          style={{ background: color }}
        />
      ))}
    </>
  );
}
