/**
 * O mural: as notas como post-its, não como lista.
 *
 * Colunas de altura livre (CSS `columns`) e não grid: num grid toda linha
 * tem a altura do card mais alto, e um post-it de duas linhas ficaria com um
 * palmo de vazio embaixo. Com colunas os cards se encaixam como papel colado
 * de verdade.
 *
 * `break-inside: avoid` é obrigatório aqui — sem ele o navegador corta um
 * card no meio e continua na coluna seguinte.
 */
import { memo } from "react";
import { Folder2, Tag } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { corPostIt, inclinacao, resumo } from "./postit";
import type { NoteComEstado } from "./useNotes";

interface Props {
  notas: NoteComEstado[];
  /** Ids já abertos — ganham um anel pra você saber o que está na mesa. */
  abertos: string[];
  onAbrir: (id: string) => void;
}

const PostIt = memo(function PostIt({
  nota, aberto, onAbrir,
}: { nota: NoteComEstado; aberto: boolean; onAbrir: (id: string) => void }) {
  const cor = corPostIt(nota.id);
  const texto = resumo(nota.body);
  const giro = inclinacao(nota.id);

  return (
    <button
      type="button"
      onClick={() => onAbrir(nota.id)}
      style={{
        background: cor.fundo,
        border: `1px solid ${aberto ? cor.fita : cor.borda}`,
        transform: `rotate(${giro}deg)`,
        boxShadow: aberto
          ? `0 0 0 2px ${cor.fita}, 0 10px 30px rgba(0,0,0,0.45)`
          : "0 6px 18px rgba(0,0,0,0.30)",
      }}
      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl p-4 text-left backdrop-blur-sm transition-transform duration-200 hover:!rotate-0 hover:-translate-y-1"
    >
      {/* Fita no topo: a pista visual de "papel colado". */}
      <span
        className="mb-3 block h-1 w-10 rounded-full"
        style={{ background: cor.fita }}
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">
          {nota.title || "Sem título"}
        </h3>
        {nota.pendente && (
          <span
            title="Editada aqui e ainda não enviada ao cofre"
            className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
          />
        )}
      </div>

      {texto ? (
        <p className="mt-1.5 line-clamp-[7] whitespace-pre-line text-xs leading-relaxed text-white/55">
          {texto}
        </p>
      ) : (
        <p className="mt-1.5 text-xs italic text-white/25">vazia</p>
      )}

      {(nota.folder || nota.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.07] pt-2.5">
          {nota.folder && (
            <span className="flex min-w-0 items-center gap-1 text-[10px] text-white/35">
              <Icon as={Folder2} size={11} />
              {/* Só a última pasta: o caminho inteiro não cabe e o que
                  interessa no card é onde ela está, não como se chega lá. */}
              <span className="truncate">{nota.folder.split("/").pop()}</span>
            </span>
          )}
          {nota.tags.slice(0, 2).map((t) => (
            <span key={t} className="flex items-center gap-0.5 text-[10px] text-white/35">
              <Icon as={Tag} size={10} />
              {t}
            </span>
          ))}
          {nota.tags.length > 2 && (
            <span className="text-[10px] text-white/25">+{nota.tags.length - 2}</span>
          )}
        </div>
      )}
    </button>
  );
});

export function PostItWall({ notas, abertos, onAbrir }: Props) {
  return (
    <div className="columns-1 gap-3 sm:columns-2 xl:columns-3 2xl:columns-4">
      {notas.map((n) => (
        <PostIt key={n.id} nota={n} aberto={abertos.includes(n.id)} onAbrir={onAbrir} />
      ))}
    </div>
  );
}
