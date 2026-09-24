/**
 * Conteúdo de um post-it aberto: título, corpo, pasta, etiquetas e os links.
 *
 * Só o miolo — a moldura, o arrasto e os botões de topo são da PostItWindow.
 * Separar permite abrir a mesma nota em contextos diferentes sem duplicar a
 * lógica de edição.
 */
import { Icon } from "@/components/ui/icon";
import { Folder2, Tag } from "iconsax-react";
import { cn } from "@/lib/utils";
import { caminhoNoCofre, extrairWikilinks } from "./markdown";
import type { NoteComEstado } from "./useNotes";

export interface Rascunho {
  title: string;
  body: string;
  folder: string;
  tags: string;
}

interface Props {
  rascunho: Rascunho;
  nota: NoteComEstado;
  todas: NoteComEstado[];
  onEditar: (patch: Partial<Rascunho>) => void;
  /** Abre outra nota pelo título (wikilink) — ou cria, se não existir. */
  onAbrirTitulo: (titulo: string) => void;
  onAbrirId: (id: string) => void;
}

export function NoteEditor({ rascunho, nota, todas, onEditar, onAbrirTitulo, onAbrirId }: Props) {
  const saem = extrairWikilinks(rascunho.body);
  const entram = todas.filter(
    (n) =>
      n.id !== nota.id &&
      extrairWikilinks(n.body).some((l) => l.toLowerCase() === rascunho.title.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <input
        value={rascunho.title}
        onChange={(e) => onEditar({ title: e.target.value })}
        placeholder="Título"
        className="w-full bg-transparent text-lg font-black tracking-tight text-white placeholder:text-white/20 outline-none"
      />

      <textarea
        value={rascunho.body}
        onChange={(e) => onEditar({ body: e.target.value })}
        placeholder="Escreva em Markdown. [[Nome da nota]] cria um link."
        // `field-sizing` não é confiável em todos os navegadores ainda, então
        // a altura é dada pelo contêiner e o textarea preenche.
        className="min-h-[220px] w-full resize-y rounded-2xl bg-white/[0.03] p-3 text-sm leading-relaxed text-white/85 placeholder:text-white/20 outline-none focus:bg-white/[0.05]"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
          <Icon as={Folder2} size={14} className="shrink-0 text-white/30" />
          <input
            value={rascunho.folder}
            onChange={(e) => onEditar({ folder: e.target.value })}
            placeholder="Pasta/Subpasta"
            className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
          <Icon as={Tag} size={14} className="shrink-0 text-white/30" />
          <input
            value={rascunho.tags}
            onChange={(e) => onEditar({ tags: e.target.value })}
            placeholder="copy, vendas"
            className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
          />
        </label>
      </div>

      {(saem.length > 0 || entram.length > 0) && (
        <div className="space-y-2 border-t border-white/[0.07] pt-3">
          {saem.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Aponta para</span>
              {saem.map((l) => {
                const existe = todas.some((n) => n.title.toLowerCase() === l.toLowerCase());
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onAbrirTitulo(l)}
                    title={existe ? "Abrir" : "Criar esta nota"}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                      existe
                        ? "bg-white/[0.07] text-white/70 hover:bg-white/15"
                        : "border border-dashed border-white/15 text-white/35 hover:text-white/60"
                    )}
                  >
                    {l}{!existe && " +"}
                  </button>
                );
              })}
            </div>
          )}
          {entram.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Apontam pra cá</span>
              {entram.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onAbrirId(n.id)}
                  className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] text-white/70 transition-colors hover:bg-white/15"
                >
                  {n.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/25">
        No cofre: <code>{caminhoNoCofre({ title: rascunho.title, folder: rascunho.folder })}</code>
      </p>
    </div>
  );
}
