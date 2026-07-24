import { useRef } from 'react';
import { Download, Upload, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
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
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-4">
      <input
        value={map.name}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Nome do mapa"
        className="w-48 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/40 hover:bg-white/[0.06] focus:bg-white/[0.08] sm:w-56"
      />

      <div className="relative">
        <select
          value={map.id}
          onChange={(e) => onSwitch(e.target.value)}
          className="appearance-none rounded-lg bg-white/[0.03] py-1.5 pl-3 pr-7 text-xs text-white/70 outline-none transition-colors hover:bg-white/[0.06]"
        >
          {maps.map((m) => (
            <option key={m.id} value={m.id} className="bg-porceli-gray-900 text-white">
              {m.name || 'Sem nome'}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" />
      </div>

      <span className="flex items-center gap-1 text-[11px] text-white/40">
        {saved ? (
          <>
            <Check size={12} className="text-emerald-400" /> salvo
          </>
        ) : (
          'salvando…'
        )}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <LiquidGlassButton onClick={onNew} className="h-9 px-4 text-xs font-medium">
          <Plus size={13} /> Novo mapa
        </LiquidGlassButton>
        <LiquidGlassButton onClick={onExport} className="h-9 px-4 text-xs font-medium">
          <Download size={13} /> Exportar
        </LiquidGlassButton>
        <LiquidGlassButton onClick={() => fileInputRef.current?.click()} className="h-9 px-4 text-xs font-medium">
          <Upload size={13} /> Importar
        </LiquidGlassButton>
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
        <LiquidGlassButton
          tint="danger"
          onClick={onDelete}
          disabled={maps.length <= 1}
          title={maps.length <= 1 ? 'Mantenha ao menos um mapa' : 'Excluir mapa'}
          className="h-9 w-9 text-red-300"
        >
          <Trash2 size={13} />
        </LiquidGlassButton>
      </div>
    </header>
  );
}
