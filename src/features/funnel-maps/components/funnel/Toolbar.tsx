import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Add, Export, Import, Trash } from 'iconsax-react';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Typing updates this local draft instantly (so the field feels responsive
  // and never gets overwritten mid-keystroke); the actual save only fires on
  // blur/Enter — "parou de digitar", not a timer that can still land between
  // letters if you type with pauses.
  const [draftName, setDraftName] = useState(map.name);
  useEffect(() => setDraftName(map.name), [map.id, map.name]);

  const commitName = () => {
    if (draftName !== map.name) onRename(draftName);
  };

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full liquid-glass no-elevation py-1.5 pl-2 pr-4">
      <input
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder="Nome do mapa"
        className="w-48 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/40 hover:bg-white/[0.06] focus:bg-white/[0.08] sm:w-56"
      />

      {/* Seletor de mapa: o menu aberto é o do sistema (Select), em cinza sólido
          como os cards do funil — o <select> nativo do navegador não é estilizável. */}
      <Select value={map.id} onValueChange={onSwitch}>
        <SelectTrigger className="h-8 w-auto min-w-[9rem] max-w-[14rem] gap-2 rounded-lg border-0 bg-white/[0.06] px-3 py-0 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="min-w-[12rem]"
        >
          {maps.map((m) => (
            <SelectItem key={m.id} value={m.id} className="rounded-lg text-xs font-medium focus:bg-[#6829C0] focus:text-white">
              {m.name || 'Sem nome'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="flex items-center gap-1 text-[11px] text-white/40">
        {saved ? (
          <>
            <Check size={12} className="text-emerald-400" /> salvo
          </>
        ) : (
          'salvando…'
        )}
      </span>
      </div>

      <div className="pointer-events-auto ml-auto flex flex-wrap items-center justify-end gap-2">
        <LiquidGlassButton onClick={onNew} className="h-9 px-4 text-xs font-medium">
          <Add size={13} /> Novo mapa
        </LiquidGlassButton>
        <LiquidGlassButton onClick={onExport} className="h-9 px-4 text-xs font-medium">
          <Import size={13} /> Exportar
        </LiquidGlassButton>
        <LiquidGlassButton onClick={() => fileInputRef.current?.click()} className="h-9 px-4 text-xs font-medium">
          <Export size={13} /> Importar
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
          <Trash size={13} />
        </LiquidGlassButton>
      </div>
    </header>
  );
}
