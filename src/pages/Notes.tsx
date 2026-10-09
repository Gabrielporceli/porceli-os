/**
 * Notas — mural de post-its + quadros (mapa mental e fluxograma).
 *
 * TRÊS DECISÕES QUE VALEM EXPLICAR:
 *
 *   • VÁRIAS NOTAS ABERTAS AO MESMO TEMPO. Cada uma é uma janela flutuante
 *     com o SEU rascunho e o SEU temporizador de gravação. Um rascunho só,
 *     como era antes, faria o texto de uma ser gravado por cima da outra ao
 *     alternar. Por isso `rascunhos` e `timers` são mapas por id, não campos.
 *
 *   • FECHAR GRAVA NA HORA. O temporizador é de 500ms; fechar sem descarregar
 *     perderia o que foi digitado no último meio segundo — que é exatamente
 *     quando a pessoa fecha.
 *
 *   • O CANVAS DOS QUADROS NÃO ABRE EM JANELA. Mapa mental em 420px não se
 *     usa; ele toma a área principal, com volta explícita.
 *
 * O formato do arquivo (Markdown + frontmatter) vive em
 * src/features/notes/markdown.ts — ver docs/NOTAS.md.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Add, ArrowLeft2, Diagram, FolderAdd, Hierarchy2, NoteText, SearchNormal1, Trash,
} from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
// `sonner`, e nao o useToast do shadcn: ver nota em useNotes.ts.
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { motion } from "framer-motion";
import { ConfirmarExclusao } from "@/features/notes/ConfirmarExclusao";
import { useNotes, type NoteComEstado } from "@/features/notes/useNotes";
import { filtrarNotas } from "@/features/notes/filtro";
import { sincronizarNota } from "@/features/notes/sync";
import { PostItWall } from "@/features/notes/PostItWall";
import { PostItWindow, type PosicaoJanela } from "@/features/notes/PostItWindow";
import { NoteEditor, type Rascunho } from "@/features/notes/NoteEditor";
import { FolderTree } from "@/features/notes/FolderTree";
import { PautaConectada } from "@/features/notes/pauta/PautaTable";
import { useSidebarBand } from "@/hooks/useSidebarBand";
import { useBoards } from "@/features/notes/boards/useBoards";
import { BoardCanvas } from "@/features/notes/boards/BoardCanvas";
import type { TipoQuadro } from "@/features/notes/boards/types";

type Aba = "notas" | "pauta" | "quadros";

interface Janela {
  id: string;
  pos: PosicaoJanela;
  z: number;
}

const LARGURA = 420;
const ALTURA = 480;
/** Deslocamento em cascata, pra janela nova não cobrir a anterior. */
const PASSO = 30;
const Z_BASE = 40;

export default function Notes() {
  const { notes, isLoading, criar, atualizar, remover, removerPasta, recarregar } = useNotes();
  const { boards, criar: criarQuadro, atualizar: atualizarQuadro, salvarGrafo, remover: removerQuadro } = useBoards();
  const isReady = usePageReady(isLoading);

  const [aba, setAba] = useState<Aba>("notas");
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null);
  const [quadroAbertoId, setQuadroAbertoId] = useState<string | null>(null);
  // Excluir nota nao pode ser um clique so: o botao mora ao lado do fechar,
  // no cabecalho da janela, e ja custou uma nota inteira.
  const [paraExcluir, setParaExcluir] = useState<string | null>(null);
  const [pastaParaExcluir, setPastaParaExcluir] = useState<{ caminho: string; total: number } | null>(null);

  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const zTopo = useRef(Z_BASE);

  const gravar = useCallback(
    (id: string, r: Rascunho) =>
      atualizar(id, {
        title: r.title,
        body: r.body,
        folder: r.folder,
        // Etiquetas deixaram de existir: só pastas organizam as notas.
        tags: [],
      }),
    [atualizar]
  );

  /** Dispara agora o que estava agendado pra este id. */
  const descarregar = useCallback(
    (id: string, r?: Rascunho) => {
      const pendente = timers.current[id];
      if (pendente) { clearTimeout(pendente); delete timers.current[id]; }
      const rascunho = r ?? rascunhos[id];
      if (!rascunho) return;
      gravar(id, rascunho).catch((e) => {
        console.error("Erro ao salvar nota:", e);
        toast.error("Não foi possível salvar a nota");
      });
    },
    [gravar, rascunhos]
  );

  // Sair da página com gravação pendente perderia o texto. Roda uma vez, na
  // desmontagem, com o que estiver na ref.
  const refDescarregar = useRef(descarregar);
  refDescarregar.current = descarregar;
  useEffect(
    () => () => {
      for (const id of Object.keys(timers.current)) refDescarregar.current(id);
    },
    []
  );

  const focar = useCallback((id: string) => {
    zTopo.current += 1;
    const z = zTopo.current;
    setJanelas((js) => js.map((j) => (j.id === id ? { ...j, z } : j)));
  }, []);

  const abrir = useCallback(
    (id: string) => {
      setJanelas((js) => {
        if (js.some((j) => j.id === id)) {
          zTopo.current += 1;
          const z = zTopo.current;
          return js.map((j) => (j.id === id ? { ...j, z } : j));
        }
        const n = js.length;
        zTopo.current += 1;
        // Cascata que volta ao início a cada 6 janelas, senão a sétima nasce
        // fora da tela.
        const salto = (n % 6) * PASSO;
        return [
          ...js,
          {
            id,
            z: zTopo.current,
            pos: {
              x: Math.max(16, Math.min(window.innerWidth - LARGURA - 24, 140 + salto)),
              y: 120 + salto,
              w: LARGURA,
              h: ALTURA,
            },
          },
        ];
      });
      setRascunhos((rs) => {
        if (rs[id]) return rs;
        const n = notes.find((x) => x.id === id);
        if (!n) return rs;
        return { ...rs, [id]: { title: n.title, body: n.body, folder: n.folder, tags: "" } };
      });
    },
    [notes]
  );

  const fechar = useCallback(
    (id: string) => {
      descarregar(id);
      setJanelas((js) => js.filter((j) => j.id !== id));
      setRascunhos((rs) => { const { [id]: _fora, ...resto } = rs; return resto; });
    },
    [descarregar]
  );

  const editar = useCallback(
    (id: string, patch: Partial<Rascunho>) => {
      setRascunhos((rs) => {
        const atualRascunho = rs[id];
        if (!atualRascunho) return rs;
        const novo = { ...atualRascunho, ...patch };
        if (timers.current[id]) clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
          delete timers.current[id];
          gravar(id, novo).catch((e) => {
            console.error("Erro ao salvar nota:", e);
            toast.error("Não foi possível salvar a nota");
          });
        }, 500);
        return { ...rs, [id]: novo };
      });
    },
    [gravar]
  );

  const mover = useCallback((id: string, pos: PosicaoJanela) => {
    setJanelas((js) => js.map((j) => (j.id === id ? { ...j, pos } : j)));
  }, []);

  // ── filtros ────────────────────────────────────────────────────────────
  const contagemPastas = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) if (n.folder) m.set(n.folder, (m.get(n.folder) ?? 0) + 1);
    return m;
  }, [notes]);

  const visiveis = useMemo(
    () => filtrarNotas(notes, { pastaAtiva, etiquetas: [], busca, mostrarIndices: false }),
    [notes, pastaAtiva, busca]
  );

  // ── ações ──────────────────────────────────────────────────────────────
  const novaNota = async () => {
    try {
      const n = await criar({ folder: pastaAtiva ?? "" });
      abrir(n.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a nota");
    }
  };

  /**
   * Cria a pasta criando a primeira nota dela.
   *
   * `folder` e caminho, nao registro: pasta sem nota nao existe em lugar
   * nenhum e sumiria da arvore no proximo carregamento. Entao a pasta nasce
   * com uma nota dentro, ja aberta pra voce escrever.
   */
  const novaPasta = async (caminho: string) => {
    try {
      const n = await criar({ folder: caminho, title: "Sem título" });
      setPastaAtiva(caminho);
      abrir(n.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a pasta");
    }
  };

  const abrirPorTitulo = async (titulo: string) => {
    const existente = notes.find((n) => n.title.toLowerCase() === titulo.toLowerCase());
    if (existente) { abrir(existente.id); return; }
    try {
      const n = await criar({ title: titulo, folder: pastaAtiva ?? "" });
      abrir(n.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a nota");
    }
  };

  const sincronizar = async (nota: NoteComEstado) => {
    setSincronizandoId(nota.id);
    // Grava o pendente ANTES de mandar: o temporizador pode não ter disparado
    // e mandaríamos a versão velha ao cofre.
    descarregar(nota.id);
    const r = await sincronizarNota(nota.id);
    setSincronizandoId(null);
    if (!r.ok) {
      toast.error("Falhou ao sincronizar", { description: r.error ?? "erro desconhecido" });
      return;
    }
    await recarregar();
    toast.success("Enviada ao cofre", { description: r.path });
  };

  const excluirPasta = async (caminho: string) => {
    try {
      const ids = await removerPasta(caminho);
      ids.forEach((id) => { if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; } });
      const fora = new Set(ids);
      setJanelas((js) => js.filter((j) => !fora.has(j.id)));
      setRascunhos((rs) => Object.fromEntries(Object.entries(rs).filter(([id]) => !fora.has(id))));
      setPastaAtiva((a) => (a && (a === caminho || a.startsWith(`${caminho}/`)) ? null : a));
      toast.success("Pasta excluída", { description: `${ids.length} ${ids.length === 1 ? "nota removida" : "notas removidas"}` });
    } catch {
      toast.error("Não foi possível excluir a pasta");
    }
  };

  const excluir = async (id: string) => {
    try {
      if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
      await remover(id);
      setJanelas((js) => js.filter((j) => j.id !== id));
      setRascunhos((rs) => { const { [id]: _fora, ...resto } = rs; return resto; });
    } catch {
      toast.error("Não foi possível excluir");
    }
  };


  const novoQuadro = async (kind: TipoQuadro) => {
    try {
      const q = await criarQuadro(kind, pastaAtiva ?? "");
      setQuadroAbertoId(q.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar o quadro");
    }
  };

  const quadroAberto = boards.find((b) => b.id === quadroAbertoId) ?? null;
  const faixa = useSidebarBand(!!quadroAberto);

  if (!isReady) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in md:-mt-2 md:space-y-8">

      {/* ── Canvas em tela: ocupa a área toda, sem barra lateral ────────── */}
      {quadroAberto ? (
        <div ref={faixa.ref} data-shift={faixa.dataShift} style={faixa.style}>
          <BoardCanvas
            key={quadroAberto.id}
            kind={quadroAberto.kind}
            nodes={quadroAberto.nodes}
            edges={quadroAberto.edges}
            title={quadroAberto.title}
            onTitle={(t) => { void atualizarQuadro(quadroAberto.id, { title: t }); }}
            onBack={() => setQuadroAbertoId(null)}
            onDelete={async () => {
              await removerQuadro(quadroAberto.id);
              setQuadroAbertoId(null);
            }}
            onChange={(nodes, edges) => {
              void salvarGrafo(quadroAberto.id, nodes, edges).catch((e) => {
                console.error("Erro ao salvar quadro:", e);
                toast.error("Não foi possível salvar o quadro");
              });
            }}
          />
        </div>
      ) : (
        <div className={cn("grid gap-4", aba !== "pauta" && "lg:grid-cols-[236px_1fr]")}>
          {aba !== "pauta" && (
          <aside className="surface-flat space-y-4 overflow-y-auto p-3.5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <div className="space-y-2">
              <span className="px-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                Pastas
              </span>
              <FolderTree
                pastas={[...contagemPastas.keys()]}
                contagem={contagemPastas}
                totalGeral={notes.length}
                ativa={pastaAtiva}
                onSelecionar={setPastaAtiva}
                onNovaPasta={(c) => { void novaPasta(c); }}
                onExcluirPasta={(caminho, total) => setPastaParaExcluir({ caminho, total })}
              />
            </div>
          </aside>
          )}

          <div className="min-w-0 space-y-4">
            <div className="surface-flat flex flex-wrap items-center gap-3 p-3.5">
              <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
                {(["notas", "pauta", "quadros"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAba(a)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm capitalize transition-colors",
                      aba === a ? "bg-white/90 font-bold text-black" : "text-white/55 hover:text-white/80"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {aba === "notas" && (
                <>
                  <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-2">
                    <Icon as={SearchNormal1} size={16} className="text-white/35" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar notas…"
                      className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                    />
                  </div>
                </>
              )}
        <div className="ml-auto flex items-center gap-2">
          {aba === "pauta" ? null : aba === "notas" ? (
            <motion.div
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <LiquidGlassButton
                tint="primary"
                onClick={novaNota}
                className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
              >
                Nova nota
              </LiquidGlassButton>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2">
              <LiquidGlassButton
                tint="primary"
                onClick={() => novoQuadro("mapa")}
                className="h-11 px-5 text-xs font-bold uppercase tracking-widest"
              >
                Mapa mental
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={() => novoQuadro("fluxo")}
                className="h-11 px-5 text-xs font-bold uppercase tracking-widest"
              >
                Fluxograma
              </LiquidGlassButton>
            </div>
          )}
        </div>
            </div>

            {aba === "pauta" ? (
              <PautaConectada />
            ) : aba === "quadros" ? (
              boards.length === 0 ? (
                <Vazio
                  titulo="Nenhum quadro ainda"
                  texto="Mapa mental pra ramificar ideia; fluxograma pra desenhar processo com decisão."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setQuadroAbertoId(b.id)}
                      className="surface-flat p-4 text-left transition-transform hover:-translate-y-0.5"
                    >
                      <Icon
                        as={b.kind === "mapa" ? Hierarchy2 : Diagram}
                        size={22}
                        className="mb-3 text-white/40"
                      />
                      <p className="truncate text-sm font-bold text-white">{b.title}</p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {b.kind === "mapa" ? "mapa mental" : "fluxograma"} · {b.nodes.length} card
                        {b.nodes.length === 1 ? "" : "s"}
                      </p>
                    </button>
                  ))}
                </div>
              )
            ) : visiveis.length === 0 ? (
              <Vazio
                titulo={notes.length === 0 ? "Nenhuma nota ainda" : "Nada com esse filtro"}
                texto={
                  notes.length === 0
                    ? "Crie a primeira com “Nova nota”."
                    : "Ajuste a busca ou a pasta."
                }
              />
            ) : (
              <PostItWall
                notas={visiveis}
                abertos={janelas.map((j) => j.id)}
                onAbrir={abrir}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Post-its abertos ──────────────────────────────────────────── */}
      {janelas.map((j) => {
        const nota = notes.find((n) => n.id === j.id);
        const rascunho = rascunhos[j.id];
        if (!nota || !rascunho) return null;
        const noTopo = j.z === Math.max(...janelas.map((x) => x.z));
        return (
          <PostItWindow
            key={j.id}
            id={j.id}
            titulo={rascunho.title}
            posicao={j.pos}
            z={j.z}
            ativa={noTopo}
            pendente={nota.pendente}
            sincronizando={sincronizandoId === j.id}
            onFocar={() => focar(j.id)}
            onMover={(p) => mover(j.id, p)}
            onFechar={() => fechar(j.id)}
            onSincronizar={() => { void sincronizar(nota); }}
            onExcluir={() => setParaExcluir(j.id)}
          >
            <NoteEditor
              rascunho={rascunho}
              nota={nota}
              todas={notes}
              onEditar={(patch) => editar(j.id, patch)}
              onAbrirTitulo={(t) => { void abrirPorTitulo(t); }}
              onAbrirId={abrir}
            />
          </PostItWindow>
        );
      })}

      <ConfirmarExclusao
        titulo={paraExcluir ? (notes.find((n) => n.id === paraExcluir)?.title ?? "") : null}
        onCancelar={() => setParaExcluir(null)}
        onConfirmar={() => { if (paraExcluir) void excluir(paraExcluir); setParaExcluir(null); }}
      />
      <ConfirmarExclusao
        rotulo="pasta"
        titulo={pastaParaExcluir ? pastaParaExcluir.caminho.split("/").pop() ?? "" : null}
        quantidade={pastaParaExcluir?.total ?? 0}
        onCancelar={() => setPastaParaExcluir(null)}
        onConfirmar={() => { if (pastaParaExcluir) void excluirPasta(pastaParaExcluir.caminho); setPastaParaExcluir(null); }}
      />
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="surface-flat p-5">
      <div className="rounded-2xl bg-white/[0.03] px-4 py-16 text-center">
        <Icon as={NoteText} size={30} className="mx-auto mb-3 text-white/25" />
        <p className="text-sm text-white/45">{titulo}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/30">{texto}</p>
      </div>
    </section>
  );
}
