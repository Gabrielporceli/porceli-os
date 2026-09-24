/**
 * Conteúdo de um post-it aberto.
 *
 * UM MODO SÓ. O editor é o texto formatado: você lê, clica no link, marca a
 * tarefa e escreve no mesmo lugar, e o Markdown fica gravado por baixo sem
 * nunca aparecer. Antes havia "ler" e "escrever" porque escrever mostrava
 * código — o motivo sumiu.
 *
 * A FICHA FICA ESCONDIDA. Pasta, etiquetas e retrolinks são sobre a nota, não
 * a nota; no post-it ocupavam mais espaço que o conteúdo. Ficam a um clique.
 *
 * O editor é carregado sob demanda: são ~200 KB que só fazem sentido com uma
 * nota aberta, e não devem pesar no resto do sistema.
 */
import { Suspense, lazy, useState } from "react";
import { Code1, Folder2, InfoCircle, Tag } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { caminhoNoCofre, extrairWikilinks } from "./markdown";
import type { NoteComEstado } from "./useNotes";

const NoteWysiwyg = lazy(() => import("./editor/NoteWysiwyg"));

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
  const [mostrarFicha, setMostrarFicha] = useState(false);
  const [mostrarCodigo, setMostrarCodigo] = useState(false);

  // Sugestao de pasta: sem isto, mover uma nota obriga a digitar
  // "Áreas/Marketing/Tráfego Pago/Google Ads" inteiro, sem errar um acento —
  // e um erro de digitacao cria uma pasta nova em silencio.
  const pastasExistentes = [...new Set(todas.map((n) => n.folder).filter(Boolean))].sort();

  const entram = todas.filter(
    (n) =>
      n.id !== nota.id &&
      extrairWikilinks(n.body).some((l) => l.toLowerCase() === rascunho.title.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-1">
        <input
          value={rascunho.title}
          onChange={(e) => onEditar({ title: e.target.value })}
          placeholder="Título"
          className="min-w-0 flex-1 bg-transparent text-lg font-black tracking-tight text-white placeholder:text-white/20 outline-none"
        />
        <button
          type="button"
          onClick={() => setMostrarFicha((v) => !v)}
          title="Pasta, etiquetas e ligações"
          className={cn(
            "mt-1 shrink-0 rounded-lg p-1.5 transition-colors",
            mostrarFicha ? "bg-white/15 text-white" : "text-white/35 hover:bg-white/10 hover:text-white/75"
          )}
        >
          <Icon as={InfoCircle} size={14} />
        </button>
      </div>

      {mostrarCodigo ? (
        <textarea
          value={rascunho.body}
          onChange={(e) => onEditar({ body: e.target.value })}
          autoFocus
          className="min-h-[240px] w-full resize-y rounded-2xl bg-white/[0.03] p-3 font-mono text-[13px] leading-relaxed text-white/85 outline-none focus:bg-white/[0.05]"
        />
      ) : (
        <Suspense fallback={<p className="py-6 text-xs text-white/30">abrindo o editor…</p>}>
          <div className="min-h-[140px] rounded-2xl bg-white/[0.02] p-3">
            <NoteWysiwyg
              body={rascunho.body}
              chaveDaNota={nota.id}
              onMudar={(markdown) => onEditar({ body: markdown })}
              onAbrirTitulo={onAbrirTitulo}
            />
          </div>
        </Suspense>
      )}

      {mostrarFicha && (
        <div className="space-y-2.5 border-t border-white/[0.07] pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
              <Icon as={Folder2} size={14} className="shrink-0 text-white/30" />
              <input
                value={rascunho.folder}
                onChange={(e) => onEditar({ folder: e.target.value })}
                list="pastas-existentes"
                placeholder="Pasta/Subpasta"
                className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
              />
              <datalist id="pastas-existentes">
                {pastasExistentes.map((f) => <option key={f} value={f} />)}
              </datalist>
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

          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[10px] text-white/25">
              <code>{caminhoNoCofre({ title: rascunho.title, folder: rascunho.folder })}</code>
            </p>
            {/* Saída de emergência: editar o Markdown na mão quando o editor
                não souber expressar alguma coisa. Fora do caminho normal. */}
            <button
              type="button"
              onClick={() => setMostrarCodigo((v) => !v)}
              title="Editar o Markdown direto"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors",
                mostrarCodigo ? "bg-white/90 font-bold text-black" : "bg-white/[0.06] text-white/40 hover:text-white/75"
              )}
            >
              <Icon as={Code1} size={11} />
              markdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
