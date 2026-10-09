/**
 * O editor da nota: você escreve no texto formatado, o Markdown é o que fica
 * gravado. Nunca aparece marcação na tela.
 *
 * NÃO HÁ MAIS MODO LEITURA SEPARADO. O editor É a leitura — dá pra clicar no
 * link, marcar a tarefa e escrever no mesmo lugar. Duas telas para a mesma
 * nota só existiam porque a escrita mostrava código.
 *
 * O CONTEÚDO SÓ É EMPURRADO PARA DENTRO QUANDO A NOTA TROCA. Reenviar a cada
 * render devolveria o cursor pro começo a cada tecla, porque o texto volta
 * do serializador com espaçamento normalizado e nunca bate byte a byte com
 * o que está no editor.
 *
 * A fidelidade da ida e volta é medida em /dev/roundtrip contra as 108 notas
 * reais — ver features/notes/editor/extensoes.ts.
 */
import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BetweenHorizonalStart, BetweenVerticalStart, Quote, Table2, Trash2, Rows3, Columns3 } from "lucide-react";
import { extensoesDaNota, markdownDoEditor } from "./extensoes";
import { MenuComandos } from "./MenuComandos";

function Botao({ titulo, ativo, onClick, children }: {
  titulo: string; ativo?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      // mouseDown e não click: o clique tiraria o foco do editor e a ação
      // rodaria sem seleção.
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={
        "flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-colors " +
        (ativo ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white")
      }
    >
      {children}
    </button>
  );
}

/** Citação e tabela; com o cursor numa tabela, aparecem os controles de linha e coluna. */
function Barra({ editor }: { editor: Editor }) {
  const { emTabela, emCitacao } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      emTabela: e.isActive("table"),
      emCitacao: e.isActive("blockquote"),
    }),
  });
  const c = () => editor.chain().focus();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-white/[0.07] pb-2">
      <Botao titulo="Citação" ativo={emCitacao} onClick={() => c().toggleBlockquote().run()}>
        <Quote size={13} /> Citação
      </Botao>
      <Botao
        titulo="Inserir tabela 3×3"
        onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table2 size={13} /> Tabela
      </Botao>

      {emTabela && (
        <>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <Botao titulo="Adicionar linha abaixo" onClick={() => c().addRowAfter().run()}>
            <BetweenHorizonalStart size={13} /> Linha
          </Botao>
          <Botao titulo="Adicionar coluna à direita" onClick={() => c().addColumnAfter().run()}>
            <BetweenVerticalStart size={13} /> Coluna
          </Botao>
          <Botao titulo="Excluir linha" onClick={() => c().deleteRow().run()}>
            <Rows3 size={13} /> Excluir linha
          </Botao>
          <Botao titulo="Excluir coluna" onClick={() => c().deleteColumn().run()}>
            <Columns3 size={13} /> Excluir coluna
          </Botao>
          <Botao titulo="Excluir tabela" onClick={() => c().deleteTable().run()}>
            <Trash2 size={13} className="text-red-400" /> Tabela
          </Botao>
        </>
      )}
    </div>
  );
}

interface Props {
  /** Markdown da nota. */
  body: string;
  /** Muda quando a janela passa a mostrar outra nota. */
  chaveDaNota: string;
  onMudar: (markdown: string) => void;
  onAbrirTitulo: (titulo: string) => void;
  /** Só leitura: usado onde não se deve editar. */
  travado?: boolean;
  /**
   * Título da nota — usado só pra esconder o H1 do corpo quando ele repete o
   * título (ver `.h1-duplicado` em index.css). Não afeta o Markdown salvo.
   */
  titulo?: string;
  /** Títulos das outras notas, pro menu `[[`. */
  titulos?: string[];
}

/** Esconde o primeiro H1 do corpo quando ele só repete o título de cima. */
function marcarH1Duplicado(editor: ReturnType<typeof useEditor>, titulo: string) {
  const primeiro = editor?.view.dom.querySelector(":scope > h1:first-child");
  if (!primeiro) return;
  const igual = primeiro.textContent?.trim().toLowerCase() === titulo.trim().toLowerCase();
  primeiro.classList.toggle("h1-duplicado", Boolean(igual && titulo.trim()));
}

export default function NoteWysiwyg({
  body, chaveDaNota, onMudar, onAbrirTitulo, travado, titulo = "", titulos = [],
}: Props) {
  const teclaRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  const editor = useEditor(
    {
      extensions: extensoesDaNota(),
      content: body,
      editable: !travado,
      editorProps: {
        attributes: {
          class: "nota-editor outline-none",
        },
        /**
         * Clique no chip de link abre a nota. Precisa ser aqui e não um
         * onClick no nó: o Tiptap renderiza o nó como HTML puro, sem React,
         * então não há onde pendurar o manipulador.
         */
        handleKeyDown: (_view, e) => teclaRef.current?.(e) ?? false,
        handleClickOn(_view, _pos, node) {
          if (node.type.name !== "wikilink") return false;
          const alvo = String(node.attrs.alvo ?? "");
          // A seção faz parte do alvo guardado; quem navega é que descarta.
          const semSecao = alvo.split("#")[0].trim();
          if (semSecao) onAbrirTitulo(semSecao);
          return true;
        },
      },
      onUpdate({ editor: ed }) {
        onMudar(markdownDoEditor(ed));
        marcarH1Duplicado(ed, titulo);
      },
    },
    // Recria o editor ao trocar de nota: mais simples e mais seguro que
    // reaproveitar a instância e sincronizar conteúdo na mão.
    [chaveDaNota]
  );

  useEffect(() => {
    editor?.setEditable(!travado);
  }, [editor, travado]);

  useEffect(() => {
    marcarH1Duplicado(editor, titulo);
  }, [editor, titulo]);

  return (
    <>
      {editor && !travado && <Barra editor={editor} />}
      {editor && !travado && <MenuComandos editor={editor} titulos={titulos} teclaRef={teclaRef} />}
      <EditorContent editor={editor} />
    </>
  );
}
