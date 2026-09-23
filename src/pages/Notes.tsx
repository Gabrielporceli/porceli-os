/**
 * Notas — ESQUELETO.
 *
 * Notas organizadas em pastas e etiquetas, mais os quadros visuais (mapa
 * mental / fluxograma). A forma está aqui; não há persistência ainda,
 * então tudo mostra estado vazio em vez de dado inventado.
 *
 * Duas decisões que já valem registrar, porque mudam o trabalho seguinte:
 *
 *   • OS QUADROS NÃO PRECISAM DE MOTOR NOVO. O sistema já roda um canvas
 *     de nós e arestas em src/features/funnel-maps (@xyflow/react), com
 *     salvar, carregar e exportar. Mapa mental e fluxograma são o mesmo
 *     motor com outros tipos de nó — reaproveitar dali é bem mais barato
 *     que começar do zero.
 *
 *   • O OBSIDIAN É UMA SINCRONIZAÇÃO DE ARQUIVOS, não uma API. Um cofre é
 *     uma pasta de Markdown, e os links são `[[wikilinks]]`. Então o
 *     formato de armazenamento da nota importa mais que a tela: guardar
 *     Markdown + frontmatter desde o começo deixa a ponte viável depois;
 *     guardar HTML ou JSON proprietário praticamente a inviabiliza.
 */
import { useState } from "react";
import { Add, Diagram, Folder, Hierarchy2, NoteText, SearchNormal1, Tag } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { cn } from "@/lib/utils";

type Aba = "notas" | "quadros";

interface Pasta {
  id: string;
  nome: string;
  total: number;
}

/** Vazios de propósito: sem persistência, a página mostra estado vazio. */
const PASTAS: Pasta[] = [];
const ETIQUETAS: string[] = [];

export default function Notes() {
  const [aba, setAba] = useState<Aba>("notas");
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null);

  // Mesma convenção das outras telas: quem desenha o "carregando" é a
  // transição do layout (overlay de blur + logo). Sem isto a página nunca
  // avisa que está carregando e a transição não acontece — foi o mesmo
  // motivo de /funnel-maps ficar de fora dela.
  const isReady = usePageReady();
  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Notas</h1>
          <p className="text-sm text-white/45">
            Notas em pastas e etiquetas, com quadros para mapas mentais e fluxogramas.
          </p>
        </div>
        <button
          type="button"
          // Sem `btn-glass-primary` e sem a classe `.bg-primary`: as duas
          // levam `backdrop-filter` (a segunda por causa da regra
          // `.bg-primary:not(...)` do index.css). Um backdrop-filter aqui,
          // logo abaixo do header fixo que também tem um, é exatamente o
          // gatilho da "tarja de brilho" — ver CORRIGIR-TARJA-DE-BRILHO.md,
          // seção 6. A cor vem do tema via style, sem passar pela classe.
          style={{ backgroundColor: "hsl(var(--primary))" }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icon as={Add} size={16} />
          {aba === "notas" ? "Nova nota" : "Novo quadro"}
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* ── Pastas e etiquetas ──────────────────────────────────── */}
        <aside className="liquid-glass rounded-3xl p-4 space-y-5 lg:sticky lg:top-32 h-fit">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">
              Pastas
            </span>
            {PASTAS.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.03] px-3 py-4 text-xs text-white/35">
                Nenhuma pasta ainda.
              </p>
            ) : (
              <ul className="space-y-1">
                {PASTAS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPastaAtiva(p.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        pastaAtiva === p.id ? "bg-white/10" : "hover:bg-white/[0.06]"
                      )}
                    >
                      <Icon as={Folder} size={16} className="text-white/40" />
                      <span className="flex-1 truncate">{p.nome}</span>
                      <span className="text-xs text-white/30">{p.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">
              Etiquetas
            </span>
            {ETIQUETAS.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.03] px-3 py-4 text-xs text-white/35">
                Nenhuma etiqueta ainda.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ETIQUETAS.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/60"
                  >
                    <Icon as={Tag} size={12} />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          {/* ── Abas + busca ──────────────────────────────────────── */}
          <div className="liquid-glass rounded-3xl p-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
              {(["notas", "quadros"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAba(a)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition-colors capitalize",
                    aba === a ? "bg-white/90 text-black font-bold" : "text-white/55 hover:text-white/80"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-2">
              <Icon as={SearchNormal1} size={16} className="text-white/35" />
              <input
                placeholder={aba === "notas" ? "Buscar notas…" : "Buscar quadros…"}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
              />
            </div>
          </div>

          {/* ── Conteúdo ──────────────────────────────────────────── */}
          {aba === "notas" ? (
            <section className="liquid-glass rounded-3xl p-5">
              <div className="rounded-2xl bg-white/[0.03] px-4 py-16 text-center">
                <Icon as={NoteText} size={30} className="mx-auto mb-3 text-white/25" />
                <p className="text-sm text-white/45">Nenhuma nota ainda</p>
                <p className="mt-1 text-xs text-white/30">
                  Crie a primeira e organize em pastas e etiquetas.
                </p>
              </div>
            </section>
          ) : (
            <section className="liquid-glass rounded-3xl p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icone: Hierarchy2, titulo: "Mapa mental", desc: "Ideias ramificando a partir de um centro." },
                  { icone: Diagram, titulo: "Fluxograma", desc: "Etapas ligadas por setas, com decisões." },
                ].map(({ icone, titulo, desc }) => (
                  <button
                    key={titulo}
                    type="button"
                    className="rounded-2xl bg-white/[0.03] px-4 py-6 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <Icon as={icone} size={24} className="mb-3 text-white/40" />
                    <p className="text-sm font-bold">{titulo}</p>
                    <p className="mt-0.5 text-xs text-white/35">{desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30">
                Os quadros vão rodar no mesmo canvas dos Mapas de Funil.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
