import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ElementIcon } from './ElementIcon';
import { ALL_VARIANTS, CATEGORY_DEFS, type FunnelNodeCategory } from '../../types/funnel';

interface QuickAddMenuProps {
  x: number;
  y: number;
  onPick: (category: FunnelNodeCategory, variantId: string) => void;
  onClose: () => void;
}

export function QuickAddMenu({ x, y, onPick, onClose }: QuickAddMenuProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const results = useMemo(
    () => ALL_VARIANTS.filter((v) => v.label.toLowerCase().includes(q)).slice(0, 40),
    [q],
  );

  // Keep the menu inside the viewport.
  const left = Math.min(x, window.innerWidth - 250);
  const top = Math.min(y, window.innerHeight - 340);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 flex w-56 flex-col rounded-xl border border-porceli-gray-700 bg-porceli-gray-900 shadow-2xl"
        style={{ left, top }}
      >
        <div className="flex items-center gap-2 border-b border-porceli-gray-800 px-2.5 py-2">
          <Search size={13} className="text-porceli-gray-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Adicionar e conectar…"
            className="w-full bg-transparent text-xs text-porceli-gray-100 outline-none placeholder:text-porceli-gray-600"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-2 py-4 text-center text-[11px] text-porceli-gray-500">Nada encontrado</p>
          )}
          {results.map((v) => (
            <button
              key={`${v.category}-${v.id}`}
              type="button"
              onClick={() => onPick(v.category, v.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-porceli-gray-800"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                <ElementIcon category={v.category} variant={v} size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-porceli-gray-100">{v.label}</span>
                <span className="block text-[10px]" style={{ color: CATEGORY_DEFS[v.category].color }}>
                  {CATEGORY_DEFS[v.category].label}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
