import { useRef } from 'react';
import { Download, Upload, Plus, Trash2, Check } from 'lucide-react';
import type { FunnelMap } from '../../types/funnel';

interface ToolbarProps {
  map: FunnelMap;
  maps: FunnelMap[];
  saved: boolean;
  onRename: (name: string) => void;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Toolbar({ map, maps, saved, onRename, onSwitch, onNew, onDelete, onExport, onImport }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-porceli-gray-800 bg-porceli-gray-900/80 px-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded bg-gradient-porceli" />
        <span className="text-sm font-semibold text-porceli-gray-100">Porceli Funnelytics</span>
      </div>

      <div className="mx-2 h-6 w-px bg-porceli-gray-800" />

      <input
        value={map.name}
        onChange={(e) => onRename(e.target.value)}
        className="w-56 rounded bg-transparent px-2 py-1 text-sm font-medium text-porceli-gray-100 outline-none hover:bg-porceli-gray-800 focus:bg-porceli-gray-800"
        placeholder="Nome do mapa"
      />

      <select
        value={map.id}
        onChange={(e) => onSwitch(e.target.value)}
        className="rounded border border-porceli-gray-800 bg-porceli-gray-900 px-2 py-1 text-xs text-porceli-gray-300 outline-none"
      >
        {maps.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name || 'Sem nome'}
          </option>
        ))}
      </select>

      <span className="flex items-center gap-1 text-[11px] text-porceli-gray-500">
        {saved ? (
          <>
            <Check size={12} className="text-emerald-400" /> salvo
          </>
        ) : (
          'salvando…'
        )}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1 rounded-md border border-porceli-gray-800 px-2.5 py-1.5 text-xs text-porceli-gray-300 hover:bg-porceli-gray-800"
        >
          <Plus size={13} /> Novo mapa
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1 rounded-md border border-porceli-gray-800 px-2.5 py-1.5 text-xs text-porceli-gray-300 hover:bg-porceli-gray-800"
        >
          <Download size={13} /> Exportar
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md border border-porceli-gray-800 px-2.5 py-1.5 text-xs text-porceli-gray-300 hover:bg-porceli-gray-800"
        >
          <Upload size={13} /> Importar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={maps.length <= 1}
          title={maps.length <= 1 ? 'Mantenha ao menos um mapa' : 'Excluir mapa'}
          className="flex items-center gap-1 rounded-md border border-porceli-gray-800 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </header>
  );
}
