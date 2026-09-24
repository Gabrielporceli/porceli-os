/**
 * Laboratório das Notas — pública, sem layout e sem banco.
 *
 * Existe porque a tela de Notas fica atrás do login, e verificar o visual
 * exigiria credenciais. Aqui os mesmos componentes rodam com dados de
 * mentira que imitam o cofre real: pastas de 4 níveis, etiquetas com cauda
 * longa e notas de tamanhos variados — que é onde os defeitos aparecem.
 *
 * Não é rota de produto. Se a tela de Notas mudar de contrato, isto quebra
 * junto de propósito: é o aviso de que o componente mudou.
 */
import { useMemo, useState } from "react";
import { PostItWall } from "@/features/notes/PostItWall";
import { filtrarNotas, ehNotaIndice } from "@/features/notes/filtro";
import { PautaTable } from "@/features/notes/pauta/PautaTable";
import type { Ideia } from "@/features/notes/pauta/usePauta";
import { PostItWindow, type PosicaoJanela } from "@/features/notes/PostItWindow";
import { NoteEditor, type Rascunho } from "@/features/notes/NoteEditor";
import { FolderTree } from "@/features/notes/FolderTree";
import { TagPicker } from "@/features/notes/TagPicker";
import { BoardCanvas } from "@/features/notes/boards/BoardCanvas";
import type { ArestaQuadro, NoQuadro, TipoQuadro } from "@/features/notes/boards/types";
import type { NoteComEstado } from "@/features/notes/useNotes";

const PASTAS = [
  "Áreas/Marketing/Copywriting",
  "Áreas/Marketing/Psicologia",
  "Áreas/Marketing/Tráfego Pago/Google Ads",
  "Áreas/Marketing/Tráfego Pago/Meta Ads",
  "Áreas/Conteúdo/Método",
  "Áreas/Conteúdo/Formatos",
  "Áreas/Conteúdo/Pauta",
  "Áreas/Vendas/Abordagem",
  "Áreas/Filosofia",
  "Áreas/Marca",
];

const TAGS = ["copy", "vendas", "conteúdo", "reels", "estratégia", "gancho", "filosofia", "índice", "tráfego", "psicologia"];

/**
 * Imita as construcoes medidas no cofre real: titulo (99% das notas),
 * wikilink (98%), citacao (80%), negrito (76%), tabela (43%), tarefa,
 * bloco de codigo e o `dataview` que so existe numa nota — e justamente o
 * que nao pode quebrar na leitura.
 */
const CORPOS = [
  "# Anatomia do Gancho\n\nUm gancho forte nasce do cruzamento entre uma **promessa real** e um *desejo*.\n\n> Promessa: emagreça de forma saudável\n> Desejo: emagreça comendo doce\n\nJuntos resolvem a objeção um do outro. Ver [[Fórmulas de Copy]] e [[Persuasão|as armas]].",
  "Curto.",
  "",
  "## Regra dos 5 segundos\n\nA cada 5 segundos precisa ter variação visual, senão a pessoa pula.\n\n| Forma | Quando usar |\n| --- | --- |\n| Troca de take | Sempre que puder |\n| Imagem sobre o vídeo | Conteúdo técnico |\n| Vídeo sobre o vídeo | Quando tem clipe |\n\nNo formato React o vídeo de fundo já fornece os estímulos.",
  "Bushido: Gi, Yuki, Jin, Rei, Makoto, Meiyo, Chugi.\n\n1. Retidão\n2. Coragem\n3. Benevolência\n\nMusashi escreveu o ~~Livro dos Quatro~~ Livro dos Cinco Anéis numa caverna. Ver [[Nota que nao existe]].",
  "- [ ] Falar sobre Ads Transparency\n- [x] Decretar compromisso com conteúdo\n\n```dataview\nTABLE WITHOUT ID task.cat AS \"Categoria\"\nFROM \"\"\nWHERE task.cat\n```\n\nCampo inline: [cat:: Tráfego Pago] tem de sobreviver intacto.\n\n---\n\nVer ![[icp-venn.svg]] e [a referência](https://exemplo.com).",
];

function fakeNotes(n: number): NoteComEstado[] {
  return Array.from({ length: n }, (_, i) => {
    const corpo = CORPOS[i % CORPOS.length];
    const titulo = corpo.match(/^#{1,2}\s+(.+)$/m)?.[1] ?? `Nota de teste ${i + 1}`;
    return {
      id: `fake-${i}`,
      title: i % 11 === 0 ? "" : titulo,
      body: corpo,
      folder: PASTAS[i % PASTAS.length],
      // Uma a cada 8 e nota indice, pra exercitar o filtro do mural.
      tags: i % 8 === 0
        ? ["índice", "porceli-company"]
        : TAGS.slice(i % 5, (i % 5) + (i % 4)),
      clientId: null,
      leadId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vaultPath: `${PASTAS[i % PASTAS.length]}/${titulo}.md`,
      syncedAt: i % 7 === 0 ? null : new Date().toISOString(),
      pendente: i % 7 === 0,
    };
  });
}

export default function NotesLab() {
  const notas = useMemo(() => fakeNotes(24), []);
  const [pasta, setPasta] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [mostrarIndices, setMostrarIndices] = useState(false);
  const [pauta, setPauta] = useState<Ideia[]>(() => [
    { id: "p1", gancho: "A cada segundo que sua pagina demora pra carregar, voce perde 11% do trafego", categoria: "Trafego Pago", formato: "Video Narrado", referencia: "", observacao: "", feito: false, ordem: 10 },
    { id: "p2", gancho: "Seu trafego esta valendo a pena?", categoria: "Trafego Pago", formato: "Conversa", referencia: "https://tiktok.com/@ads.comlucas/video/7490696973067029765", observacao: "", feito: false, ordem: 20 },
    { id: "p3", gancho: "As pessoas compram com o emocional e justificam com o racional", categoria: "Marketing/Vendas", formato: "", referencia: "", observacao: "Copy", feito: false, ordem: 30 },
    { id: "p4", gancho: "Decretar compromisso com a producao de conteudo", categoria: "Posicionamento", formato: "Conversa", referencia: "", observacao: "Posicionamento", feito: true, ordem: 40 },
  ]);
  const [janelas, setJanelas] = useState<{ id: string; pos: PosicaoJanela; z: number }[]>([]);
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({});
  const [tipoQuadro, setTipoQuadro] = useState<TipoQuadro>("mapa");
  const [grafo, setGrafo] = useState<{ nodes: NoQuadro[]; edges: ArestaQuadro[] }>(() => ({
    nodes: [
      { id: "a", type: "quadroNo", position: { x: 0, y: 0 }, data: { texto: "Conteúdo", papel: "central", cor: 0 } },
      { id: "b", type: "quadroNo", position: { x: 240, y: -80 }, data: { texto: "Método", papel: "ideia", cor: 1 } },
      { id: "c", type: "quadroNo", position: { x: 240, y: 60 }, data: { texto: "Formatos", papel: "ideia", cor: 2 } },
    ],
    edges: [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "a", target: "c" },
    ],
  }));

  const contagemPastas = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notas) m.set(n.folder, (m.get(n.folder) ?? 0) + 1);
    return m;
  }, [notas]);

  const contagemTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notas) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    // Cauda longa artificial: é o que quebrava a tela antiga.
    for (let i = 0; i < 180; i++) m.set(`rara-${i}`, 1);
    return m;
  }, [notas]);

  const visiveis = filtrarNotas(notas, { pastaAtiva: pasta, etiquetas: tags, busca: "", mostrarIndices });

  const abrir = (id: string) => {
    setJanelas((js) => {
      if (js.some((j) => j.id === id)) return js;
      const k = js.length % 6;
      return [...js, { id, z: 40 + js.length, pos: { x: 160 + k * 30, y: 90 + k * 30, w: 420, h: 480 } }];
    });
    setRascunhos((rs) => {
      if (rs[id]) return rs;
      const n = notas.find((x) => x.id === id)!;
      return { ...rs, [id]: { title: n.title, body: n.body, folder: n.folder, tags: n.tags.join(", ") } };
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-6 text-white">
      <h1 className="mb-1 text-xl font-black">Laboratório — Notas</h1>
      <p className="mb-5 text-xs text-white/40">
        {notas.length} notas falsas · {contagemPastas.size} pastas (até 4 níveis) · {contagemTags.size} etiquetas
      </p>

      <div className="grid gap-4 lg:grid-cols-[236px_1fr]">
        <aside className="h-fit space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="space-y-2">
            <span className="px-1 text-[11px] font-black uppercase tracking-widest text-white/45">Pastas</span>
            <FolderTree
              pastas={[...contagemPastas.keys()]}
              contagem={contagemPastas}
              totalGeral={notas.length}
              ativa={pasta}
              onSelecionar={setPasta}
            />
          </div>
          <div className="border-t border-white/[0.06] pt-3.5">
            <TagPicker
              contagem={contagemTags}
              ativas={tags}
              onAlternar={(t) => setTags((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))}
              onLimpar={() => setTags([])}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section>
            <p className="mb-2 text-xs text-white/40">Pauta</p>
            <PautaTable
              ideias={pauta}
              isLoading={false}
              criar={() => setPauta((a) => [{ id: crypto.randomUUID(), gancho: "", categoria: "", formato: "", referencia: "", observacao: "", feito: false, ordem: 0 }, ...a])}
              atualizar={(id, patch) => setPauta((a) => a.map((i) => (i.id === id ? { ...i, ...patch } : i)))}
              remover={(id) => setPauta((a) => a.filter((i) => i.id !== id))}
            />
          </section>

          <section>
            <button
              type="button"
              onClick={() => setMostrarIndices((v) => !v)}
              className={`mb-2 rounded-full px-3 py-1 text-xs ${mostrarIndices ? "bg-white/90 font-bold text-black" : "bg-white/10 text-white/50"}`}
            >
              {mostrarIndices ? "ocultar" : "mostrar"} indices
            </button>
            <p className="mb-2 text-xs text-white/40">
              Mural — {visiveis.length} visíveis · clique pra abrir várias
            </p>
            <PostItWall notas={visiveis} abertos={janelas.map((j) => j.id)} onAbrir={abrir} />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs text-white/40">Quadro:</p>
              {(["mapa", "fluxo"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTipoQuadro(k)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    tipoQuadro === k ? "bg-white/90 font-bold text-black" : "bg-white/10 text-white/60"
                  }`}
                >
                  {k === "mapa" ? "mapa mental" : "fluxograma"}
                </button>
              ))}
            </div>
            <div className="h-[460px] overflow-hidden rounded-3xl border border-white/10">
              <BoardCanvas
                kind={tipoQuadro}
                nodes={grafo.nodes}
                edges={grafo.edges}
                onChange={(nodes, edges) => setGrafo({ nodes, edges })}
              />
            </div>
          </section>
        </div>
      </div>

      {janelas.map((j) => {
        const nota = notas.find((n) => n.id === j.id)!;
        const r = rascunhos[j.id];
        if (!r) return null;
        return (
          <PostItWindow
            key={j.id}
            id={j.id}
            titulo={r.title}
            posicao={j.pos}
            z={j.z}
            ativa={j.z === Math.max(...janelas.map((x) => x.z))}
            pendente={nota.pendente}
            onFocar={() =>
              setJanelas((js) => {
                const topo = Math.max(...js.map((x) => x.z)) + 1;
                return js.map((x) => (x.id === j.id ? { ...x, z: topo } : x));
              })
            }
            onMover={(p) => setJanelas((js) => js.map((x) => (x.id === j.id ? { ...x, pos: p } : x)))}
            onFechar={() => setJanelas((js) => js.filter((x) => x.id !== j.id))}
          >
            <NoteEditor
              rascunho={r}
              nota={nota}
              todas={notas}
              onEditar={(patch) => setRascunhos((rs) => ({ ...rs, [j.id]: { ...rs[j.id], ...patch } }))}
              onAbrirTitulo={() => { /* laboratório: não cria nota */ }}
              onAbrirId={abrir}
            />
          </PostItWindow>
        );
      })}
    </div>
  );
}
