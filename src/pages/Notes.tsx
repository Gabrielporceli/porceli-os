/**
 * Notas — ligada ao Supabase.
 *
 * Duas decisões de layout que valem explicar:
 *
 *   • LISTA E EDITOR NÃO CONVIVEM. Ao abrir uma nota, o editor SUBSTITUI a
 *     lista. Três colunas (pastas | lista | editor) só caberiam no desktop
 *     largo e obrigariam um segundo layout pro celular — e o celular é onde
 *     este sistema mais é usado. Um caminho só, igual nos dois.
 *
 *   • SALVAMENTO AUTOMÁTICO com temporizador de 500ms, mesmo padrão do
 *     funnel-maps. Nota com botão "Salvar" perde texto: a pessoa fecha a
 *     aba e o que digitou some.
 *
 * A sincronização com o cofre é disparada à parte (botão), nunca no
 * automático: cada gravação viraria um commit no repositório.
 *
 * O formato do arquivo (Markdown + frontmatter) vive em
 * src/features/notes/markdown.ts — ver docs/NOTAS-OBSIDIAN.md.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Add,
  ArrowLeft2,
  Diagram,
  Folder,
  Hierarchy2,
  NoteText,
  Import,
  Refresh,
  SearchNormal1,
  Tag,
  Trash,
} from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
// `sonner`, e nao o useToast do shadcn: ver nota em useNotes.ts.
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotes, type NoteComEstado } from "@/features/notes/useNotes";
import { caminhoNoCofre, extrairWikilinks } from "@/features/notes/markdown";
import { importarDoCofre, sincronizarNota } from "@/features/notes/sync";

type Aba = "notas" | "quadros";
type Rascunho = { title: string; body: string; folder: string; tags: string };

export default function Notes() {
  const { notes, pastas, etiquetas, isLoading, criar, atualizar, remover, recarregar } = useNotes();
  const isReady = usePageReady(isLoading);

  const [aba, setAba] = useState<Aba>("notas");
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null);
  const [etiquetaAtiva, setEtiquetaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Rascunho local: o textarea não pode esperar a ida ao banco a cada tecla.
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aberta = notes.find((n) => n.id === abertaId) ?? null;

  // Trocar de nota descarta o temporizador pendente da anterior — senão o
  // texto de uma seria gravado por cima da outra.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const n = notes.find((x) => x.id === abertaId);
    setRascunho(
      n ? { title: n.title, body: n.body, folder: n.folder, tags: n.tags.join(", ") } : null
    );
    // Só reage à TROCA de nota. Incluir `notes` aqui faria o rascunho ser
    // sobrescrito a cada gravação, apagando o que foi digitado no meio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abertaId]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const gravar = useCallback(
    (id: string, r: Rascunho) =>
      atualizar(id, {
        title: r.title,
        body: r.body,
        folder: r.folder,
        tags: r.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    [atualizar]
  );

  const editar = (patch: Partial<Rascunho>) => {
    if (!rascunho || !abertaId) return;
    const novo = { ...rascunho, ...patch };
    setRascunho(novo);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      gravar(abertaId, novo).catch((e) => {
        console.error("Erro ao salvar nota:", e);
        toast.error("Não foi possível salvar a nota");
      });
    }, 500);
  };

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return notes.filter((n) => {
      if (pastaAtiva !== null && n.folder !== pastaAtiva) return false;
      if (etiquetaAtiva && !n.tags.includes(etiquetaAtiva)) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    });
  }, [notes, pastaAtiva, etiquetaAtiva, busca]);

  const novaNota = async () => {
    try {
      const n = await criar({ folder: pastaAtiva ?? "" });
      setAbertaId(n.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a nota");
    }
  };

  const sincronizar = async (n: NoteComEstado) => {
    setSincronizando(true);
    // Grava o pendente ANTES de mandar pro cofre: o temporizador pode não
    // ter disparado ainda, e sincronizaríamos a versão velha.
    let renomeadaDe: string | null = null;
    if (rascunho) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      const destino = caminhoNoCofre({ title: rascunho.title, folder: rascunho.folder });
      renomeadaDe = n.vaultPath && n.vaultPath !== destino ? n.vaultPath : null;
      await gravar(n.id, rascunho).catch(() => {});
    }
    const r = await sincronizarNota(n.id, renomeadaDe);
    setSincronizando(false);
    if (r.ok) toast.success("Sincronizado", { description: r.path });
    else toast.error("Falhou ao sincronizar", { description: r.error ?? "erro desconhecido" });
  };

  /**
   * Resolve um `[[link]]` como o Obsidian: casa pelo TÍTULO, não por caminho.
   * Sem correspondência, cria a nota na mesma pasta da atual — é o
   * comportamento que a pessoa espera ao clicar num link que ainda não
   * existe, e evita link morto acumulando no cofre.
   */
  const abrirPorTitulo = async (titulo: string) => {
    const alvo = notes.find((n) => n.title.toLowerCase() === titulo.toLowerCase());
    if (alvo) {
      setAbertaId(alvo.id);
      return;
    }
    try {
      const n = await criar({ title: titulo, folder: rascunho?.folder ?? "" });
      setAbertaId(n.id);
      toast.success("Nota criada", { description: titulo });
    } catch {
      toast.error("Não foi possível criar a nota");
    }
  };

  const importar = async () => {
    setImportando(true);
    const r = await importarDoCofre();
    setImportando(false);
    if (!r.ok) {
      toast.error("Falhou ao importar", { description: r.error ?? "erro desconhecido" });
      return;
    }
    await recarregar();
    const novas = (r.importadas ?? 0) + (r.atualizadas ?? 0);
    const partes = [`${r.importadas ?? 0} nova(s)`, `${r.atualizadas ?? 0} atualizada(s)`];
    if (r.conflitos?.length) partes.push(`${r.conflitos.length} com edicao local (nao tocadas)`);
    toast[novas > 0 ? "success" : "info"](
      novas > 0 ? "Cofre importado" : "Nada novo no cofre",
      { description: partes.join(" · ") }
    );
  };

  const excluir = async (id: string) => {
    try {
      await remover(id);
      setAbertaId(null);
    } catch {
      toast.error("Não foi possível excluir");
    }
  };

  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Notas</h1>
          <p className="text-sm text-white/45">
            {notes.length === 0
              ? "Notas em pastas e etiquetas, com quadros para mapas mentais e fluxogramas."
              : `${notes.length} nota${notes.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={importar}
          disabled={importando}
          title="Trazer as notas do cofre do Obsidian"
          className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Icon as={Import} size={16} className={importando ? "animate-pulse" : ""} />
          {importando ? "Importando..." : "Importar do cofre"}
        </button>
        <button
          type="button"
          onClick={aba === "notas" ? novaNota : undefined}
          // Sem `btn-glass-primary` e sem a classe `.bg-primary`: as duas
          // levam backdrop-filter, e um backdrop-filter logo abaixo do header
          // fixo é o gatilho da "tarja de brilho" — ver
          // CORRIGIR-TARJA-DE-BRILHO.md, seção 6.
          style={{ backgroundColor: "hsl(var(--primary))" }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Icon as={Add} size={16} />
          {aba === "notas" ? "Nova nota" : "Novo quadro"}
        </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* ── Pastas e etiquetas ──────────────────────────────────── */}
        <aside className="liquid-glass rounded-3xl p-4 space-y-5 lg:sticky lg:top-32 h-fit">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">Pastas</span>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setPastaAtiva(null)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    pastaAtiva === null ? "bg-white/10" : "hover:bg-white/[0.06]"
                  )}
                >
                  <Icon as={NoteText} size={16} className="text-white/40" />
                  <span className="flex-1">Todas</span>
                  <span className="text-xs text-white/30">{notes.length}</span>
                </button>
              </li>
              {pastas.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => setPastaAtiva(p)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      pastaAtiva === p ? "bg-white/10" : "hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon as={Folder} size={16} className="text-white/40" />
                    <span className="flex-1 truncate">{p}</span>
                    <span className="text-xs text-white/30">
                      {notes.filter((n) => n.folder === p).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {pastas.length === 0 && (
              <p className="px-3 text-xs text-white/30">
                A pasta nasce ao escrever o caminho numa nota.
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <span className="text-xs font-black uppercase tracking-widest text-white/45">Etiquetas</span>
            {etiquetas.length === 0 ? (
              <p className="px-3 text-xs text-white/30">Nenhuma etiqueta ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {etiquetas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEtiquetaAtiva(etiquetaAtiva === t ? null : t)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                      etiquetaAtiva === t
                        ? "bg-white/90 text-black font-bold"
                        : "bg-white/[0.06] text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Icon as={Tag} size={12} />
                    {t}
                  </button>
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
                  onClick={() => { setAba(a); setAbertaId(null); }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition-colors capitalize",
                    aba === a ? "bg-white/90 text-black font-bold" : "text-white/55 hover:text-white/80"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>

            {aba === "notas" && !aberta && (
              <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-2">
                <Icon as={SearchNormal1} size={16} className="text-white/35" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar notas…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                />
              </div>
            )}
          </div>

          {/* ── Conteúdo ──────────────────────────────────────────── */}
          {aba === "quadros" ? (
            <section className="liquid-glass rounded-3xl p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icone: Hierarchy2, titulo: "Mapa mental", desc: "Ideias ramificando a partir de um centro." },
                  { icone: Diagram, titulo: "Fluxograma", desc: "Etapas ligadas por setas, com decisões." },
                ].map(({ icone, titulo, desc }) => (
                  <div key={titulo} className="rounded-2xl bg-white/[0.03] px-4 py-6">
                    <Icon as={icone} size={24} className="mb-3 text-white/40" />
                    <p className="text-sm font-bold">{titulo}</p>
                    <p className="mt-0.5 text-xs text-white/35">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30">
                Ainda não implementado. Vão rodar no mesmo canvas dos Mapas de Funil.
              </p>
            </section>
          ) : aberta && rascunho ? (
            /* ── Editor ── */
            <section className="liquid-glass rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAbertaId(null)}
                  className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white/80 transition-colors"
                >
                  <Icon as={ArrowLeft2} size={14} />
                  Voltar
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/30">
                    {aberta.pendente ? "não sincronizada" : "sincronizada"}
                  </span>
                  <button
                    type="button"
                    disabled={sincronizando}
                    onClick={() => sincronizar(aberta)}
                    title="Enviar para o cofre"
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon as={Refresh} size={14} className={sincronizando ? "animate-spin" : ""} />
                    Sincronizar
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(aberta.id)}
                    className="rounded-full bg-white/[0.06] p-1.5 text-white/50 transition-colors hover:bg-red-500/20 hover:text-red-300"
                    aria-label="Excluir nota"
                  >
                    <Icon as={Trash} size={14} />
                  </button>
                </div>
              </div>

              <input
                value={rascunho.title}
                onChange={(e) => editar({ title: e.target.value })}
                placeholder="Título"
                className="w-full bg-transparent text-xl font-black tracking-tight text-white placeholder:text-white/20 outline-none"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 block">
                  <span className="text-[11px] uppercase tracking-widest text-white/35">Pasta</span>
                  <input
                    value={rascunho.folder}
                    onChange={(e) => editar({ folder: e.target.value })}
                    list="pastas-existentes"
                    placeholder="Clientes/Acme"
                    className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                  />
                  <datalist id="pastas-existentes">
                    {pastas.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </label>
                <label className="space-y-1 block">
                  <span className="text-[11px] uppercase tracking-widest text-white/35">
                    Etiquetas (vírgula)
                  </span>
                  <input
                    value={rascunho.tags}
                    onChange={(e) => editar({ tags: e.target.value })}
                    placeholder="reuniao, proposta"
                    className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                  />
                </label>
              </div>

              <textarea
                value={rascunho.body}
                onChange={(e) => editar({ body: e.target.value })}
                placeholder="Escreva em Markdown. Use [[nome]] para ligar notas — é o mesmo link do Obsidian."
                rows={18}
                className="w-full resize-y rounded-2xl bg-white/[0.03] p-4 font-mono text-sm leading-relaxed text-white/85 placeholder:text-white/20 outline-none"
              />

              {(() => {
                const saem = extrairWikilinks(rascunho.body);
                // Backlinks: quem aponta pra esta nota. O Obsidian mostra isso
                // por padrão, e é o que transforma notas soltas em grafo.
                const entram = notes.filter(
                  (n) =>
                    n.id !== aberta.id &&
                    extrairWikilinks(n.body).some(
                      (l) => l.toLowerCase() === rascunho.title.toLowerCase()
                    )
                );
                if (!saem.length && !entram.length) return null;
                return (
                  <div className="space-y-2 border-t border-white/[0.06] pt-3">
                    {saem.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] uppercase tracking-widest text-white/30">Aponta para</span>
                        {saem.map((l) => {
                          const existe = notes.some((n) => n.title.toLowerCase() === l.toLowerCase());
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => abrirPorTitulo(l)}
                              title={existe ? "Abrir" : "Criar esta nota"}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs transition-colors",
                                existe
                                  ? "bg-white/[0.06] text-white/70 hover:bg-white/10"
                                  : "border border-dashed border-white/15 text-white/35 hover:text-white/60"
                              )}
                            >
                              {l}
                              {!existe && " +"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {entram.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] uppercase tracking-widest text-white/30">Apontam para cá</span>
                        {entram.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setAbertaId(n.id)}
                            className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/10"
                          >
                            {n.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="text-[11px] text-white/25">
                No cofre: <code>{caminhoNoCofre({ title: rascunho.title, folder: rascunho.folder })}</code>
              </p>
            </section>
          ) : visiveis.length === 0 ? (
            <section className="liquid-glass rounded-3xl p-5">
              <div className="rounded-2xl bg-white/[0.03] px-4 py-16 text-center">
                <Icon as={NoteText} size={30} className="mx-auto mb-3 text-white/25" />
                <p className="text-sm text-white/45">
                  {notes.length === 0 ? "Nenhuma nota ainda" : "Nada encontrado com esse filtro"}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  {notes.length === 0
                    ? "Crie a primeira e organize em pastas e etiquetas."
                    : "Ajuste a busca, a pasta ou a etiqueta."}
                </p>
              </div>
            </section>
          ) : (
            <section className="liquid-glass rounded-3xl p-3">
              <ul className="divide-y divide-white/[0.05]">
                {visiveis.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setAbertaId(n.id)}
                      className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-bold">{n.title}</span>
                        {n.pendente && (
                          <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                            pendente
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/35">
                        {n.folder ? `${n.folder} · ` : ""}
                        {n.body.replace(/\s+/g, " ").slice(0, 90) || "vazia"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
