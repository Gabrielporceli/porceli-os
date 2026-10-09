/**
 * Menu de comandos do editor.
 *
 *   `/`   abre os comandos (título, lista, citação, tabela…);
 *   `[[`  abre a lista de notas pra criar um link.
 *
 * Sem o pacote @tiptap/suggestion: não está instalado e a necessidade é
 * pequena. O gatilho é recalculado a cada transação olhando só o texto antes
 * do cursor no bloco atual; o menu some sozinho se o cursor sai do padrão.
 *
 * As teclas (setas, Enter, Esc) chegam por `teclaRef`, que o editor consulta
 * em `handleKeyDown` — o menu não pode roubar o foco do texto.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  CheckSquare, Code2, Heading1, Heading2, Heading3, Link2, List, ListOrdered,
  Minus, Quote, Table2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comando {
  id: string;
  rotulo: string;
  dica: string;
  chaves: string;
  icone: LucideIcon;
  /** Roda depois de apagar o `/consulta`. */
  rodar: (e: Editor) => void;
}

const COMANDOS: Comando[] = [
  { id: "h1", rotulo: "Título 1", dica: "Título grande", chaves: "titulo h1 heading", icone: Heading1,
    rodar: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: "h2", rotulo: "Título 2", dica: "Título médio", chaves: "titulo h2 heading", icone: Heading2,
    rodar: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3", rotulo: "Título 3", dica: "Título pequeno", chaves: "titulo h3 heading", icone: Heading3,
    rodar: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "lista", rotulo: "Lista", dica: "Marcadores", chaves: "lista bullet marcadores", icone: List,
    rodar: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "numerada", rotulo: "Lista numerada", dica: "1, 2, 3…", chaves: "lista numerada ordenada", icone: ListOrdered,
    rodar: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "checklist", rotulo: "Checklist", dica: "Tarefas com caixa", chaves: "checklist tarefa todo", icone: CheckSquare,
    rodar: (e) => e.chain().focus().toggleTaskList().run() },
  { id: "citacao", rotulo: "Citação", dica: "Texto comentado", chaves: "citacao comentario quote", icone: Quote,
    rodar: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "tabela", rotulo: "Tabela", dica: "3 × 3 com título", chaves: "tabela table grade", icone: Table2,
    rodar: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "link", rotulo: "Link de nota", dica: "Liga a outra nota", chaves: "link nota wikilink referencia", icone: Link2,
    // Escreve `[[`; o gatilho seguinte abre a lista de notas.
    rodar: (e) => e.chain().focus().insertContent("[[").run() },
  { id: "divisoria", rotulo: "Divisória", dica: "Linha horizontal", chaves: "divisoria linha hr separador", icone: Minus,
    rodar: (e) => e.chain().focus().setHorizontalRule().run() },
  { id: "codigo", rotulo: "Bloco de código", dica: "Texto monoespaçado", chaves: "codigo code bloco", icone: Code2,
    rodar: (e) => e.chain().focus().toggleCodeBlock().run() },
];

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Gatilho {
  tipo: "/" | "[[";
  consulta: string;
  /** Início do `/consulta` ou `[[consulta` no documento. */
  de: number;
  x: number;
  y: number;
}

function lerGatilho(editor: Editor): Gatilho | null {
  const { selection } = editor.state;
  if (!selection.empty || !editor.isFocused) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.type.name === "codeBlock") return null;

  const antes = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const barra = /(?:^|\s)\/([^\s/]*)$/.exec(antes);
  const colchete = /\[\[([^[\]|]*)$/.exec(antes);

  let tipo: Gatilho["tipo"];
  let consulta: string;
  let de: number;
  if (colchete) {
    tipo = "[[";
    consulta = colchete[1];
    de = $from.pos - consulta.length - 2;
  } else if (barra) {
    tipo = "/";
    consulta = barra[1];
    de = $from.pos - consulta.length - 1;
  } else {
    return null;
  }

  const c = editor.view.coordsAtPos($from.pos);
  return { tipo, consulta, de, x: c.left, y: c.bottom };
}

interface Props {
  editor: Editor;
  titulos: string[];
  teclaRef: MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
}

export function MenuComandos({ editor, titulos, teclaRef }: Props) {
  const [gatilho, setGatilho] = useState<Gatilho | null>(null);
  const [indice, setIndice] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const recalcular = () => setGatilho(lerGatilho(editor));
    editor.on("transaction", recalcular);
    editor.on("blur", recalcular);
    editor.on("focus", recalcular);
    return () => {
      editor.off("transaction", recalcular);
      editor.off("blur", recalcular);
      editor.off("focus", recalcular);
    };
  }, [editor]);

  const itens = useMemo(() => {
    if (!gatilho) return [];
    const q = normalizar(gatilho.consulta);
    if (gatilho.tipo === "[[") {
      return titulos
        .filter((t) => normalizar(t).includes(q))
        .slice(0, 30)
        .map((t) => ({ id: t, rotulo: t, dica: "", icone: Link2 as LucideIcon }));
    }
    return COMANDOS.filter((c) => normalizar(`${c.rotulo} ${c.chaves}`).includes(q));
  }, [gatilho, titulos]);

  // Volta ao topo quando o filtro muda.
  useEffect(() => { setIndice(0); }, [gatilho?.tipo, gatilho?.consulta]);

  const escolher = useCallback(
    (i: number) => {
      const g = gatilho;
      const item = itens[i];
      if (!g || !item) return;
      const fim = editor.state.selection.from;
      const base = editor.chain().focus().deleteRange({ from: g.de, to: fim });
      if (g.tipo === "[[") {
        base.insertContent([
          { type: "wikilink", attrs: { alvo: item.rotulo, rotulo: item.rotulo } },
          { type: "text", text: " " },
        ]).run();
      } else {
        base.run();
        COMANDOS.find((c) => c.id === item.id)?.rodar(editor);
      }
    },
    [editor, gatilho, itens]
  );

  // O editor consulta isto a cada tecla; devolve true quando o menu consumiu.
  teclaRef.current = (e) => {
    if (!gatilho || itens.length === 0) return false;
    if (e.key === "ArrowDown") { setIndice((i) => (i + 1) % itens.length); return true; }
    if (e.key === "ArrowUp") { setIndice((i) => (i - 1 + itens.length) % itens.length); return true; }
    if (e.key === "Enter" || e.key === "Tab") { escolher(indice); return true; }
    if (e.key === "Escape") { setGatilho(null); return true; }
    return false;
  };

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>('[data-ativo="true"]')?.scrollIntoView({ block: "nearest" });
  }, [indice, itens]);

  if (!gatilho || itens.length === 0) return null;

  const ALTURA = 280;
  const abreAcima = gatilho.y + ALTURA + 12 > window.innerHeight;
  const esquerda = Math.min(gatilho.x, window.innerWidth - 272);

  return createPortal(
    <div
      ref={listaRef}
      className="fixed z-[9999] max-h-[280px] w-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#17171c]/95 p-1.5 shadow-2xl backdrop-blur-xl scrollbar-hide"
      style={{
        left: esquerda,
        ...(abreAcima ? { bottom: window.innerHeight - gatilho.y + 24 } : { top: gatilho.y + 6 }),
      }}
    >
      <p className="px-2 pb-1 pt-0.5 text-[10px] font-black uppercase tracking-widest text-white/30">
        {gatilho.tipo === "[[" ? "Link de nota" : "Inserir"}
      </p>
      {itens.map((item, i) => {
        const Icone = item.icone;
        return (
          <button
            key={item.id}
            type="button"
            data-ativo={i === indice}
            // mouseDown: o clique tiraria o foco do editor e o gatilho sumiria.
            onMouseDown={(e) => { e.preventDefault(); escolher(i); }}
            onMouseEnter={() => setIndice(i)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors",
              i === indice ? "bg-white/10" : "hover:bg-white/[0.06]"
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/60">
              <Icone size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-white">{item.rotulo}</span>
              {item.dica && <span className="block truncate text-[10px] text-white/35">{item.dica}</span>}
            </span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
