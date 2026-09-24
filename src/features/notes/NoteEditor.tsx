/**
 * Conteúdo de um post-it aberto.
 *
 * DOIS MODOS, e o padrão é LER. A nota abre formatada — título, citação,
 * tabela, caixa de tarefa clicável, e os `[[links]]` como botões no meio do
 * texto. Escrever mostra o Markdown cru, porque é isso que vai pro cofre e é
 * o único jeito de não perder `dataview` e campos `[cat:: x]` na volta.
 * Duplo clique no texto entra em escrita, igual ao Obsidian.
 *
 * LENDO SÓ APARECE A NOTA. Pasta, etiquetas, retrolinks e o caminho no cofre
 * moram no modo escrever. Eles são a ficha da nota, não a nota — e no post-it
 * ocupavam mais espaço que o conteúdo. Nada sumiu: está tudo a um clique.
 *
 * O modo é por nota e por janela: ler uma enquanto edita outra é justamente
 * o que ter várias janelas serve.
 */
import { useState } from "react";
import { Book1, Edit2, Folder2, Tag } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { caminhoNoCofre, extrairWikilinks } from "./markdown";
import { NoteRender, alternarTarefaNaLinha } from "./NoteRender";
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
  onAbrirTitulo: (titulo: string) => void;
  onAbrirId: (id: string) => void;
}

export function NoteEditor({ rascunho, nota, todas, onEditar, onAbrirTitulo, onAbrirId }: Props) {
  const [escrevendo, setEscrevendo] = useState(false);

  const existentes = new Set(todas.map((n) => n.title.toLowerCase()));
  const saem = extrairWikilinks(rascunho.body);
  const entram = todas.filter(
    (n) =>
      n.id !== nota.id &&
      extrairWikilinks(n.body).some((l) => l.toLowerCase() === rascunho.title.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <input
          value={rascunho.title}
          onChange={(e) => onEditar({ title: e.target.value })}
          placeholder="Título"
          className="min-w-0 flex-1 bg-transparent text-lg font-black tracking-tight text-white placeholder:text-white/20 outline-none"
        />
        <button
          type="button"
          onClick={() => setEscrevendo((v) => !v)}
          title={escrevendo ? "Ver formatado" : "Editar o Markdown e a ficha"}
          className={cn(
            "mt-1 flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors",
            escrevendo
              ? "bg-white/90 text-black"
              : "bg-white/[0.07] text-white/55 hover:bg-white/15 hover:text-white/85"
          )}
        >
          <Icon as={escrevendo ? Book1 : Edit2} size={12} />
          {escrevendo ? "ler" : "escrever"}
        </button>
      </div>

      {escrevendo ? (
        <>
          <textarea
            value={rascunho.body}
            onChange={(e) => onEditar({ body: e.target.value })}
            autoFocus
            placeholder="Markdown. [[Nome]] vira link, - [ ] vira tarefa."
            // `font-mono` está aqui de propósito, mas hoje não muda nada: o
            // tailwind.config mapeia mono (e serif) para a Founders Grotesk,
            // a regra de uma fonte só do sistema. Se um dia valer alinhar
            // tabela no Markdown cru, é lá que se troca — não aqui.
            className="min-h-[240px] w-full resize-y rounded-2xl bg-white/[0.03] p-3 font-mono text-[13px] leading-relaxed text-white/85 placeholder:text-white/20 outline-none focus:bg-white/[0.05]"
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

          {saem.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-3">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Aponta para</span>
              {saem.map((l) => {
                const existe = existentes.has(l.toLowerCase());
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onAbrirTitulo(l)}
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

          <p className="text-[10px] text-white/25">
            No cofre: <code>{caminhoNoCofre({ title: rascunho.title, folder: rascunho.folder })}</code>
          </p>
        </>
      ) : (
        <div
          onDoubleClick={() => setEscrevendo(true)}
          title="Duplo clique para editar"
          className="min-h-[120px] cursor-text rounded-2xl bg-white/[0.02] p-3"
        >
          <NoteRender
            body={rascunho.body}
            existentes={existentes}
            onAbrirTitulo={onAbrirTitulo}
            onAlternarTarefa={(linha) =>
              onEditar({ body: alternarTarefaNaLinha(rascunho.body, linha) })
            }
          />
        </div>
      )}
    </div>
  );
}
