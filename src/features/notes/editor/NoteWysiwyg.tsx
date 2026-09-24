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
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { extensoesDaNota, markdownDoEditor } from "./extensoes";

interface Props {
  /** Markdown da nota. */
  body: string;
  /** Muda quando a janela passa a mostrar outra nota. */
  chaveDaNota: string;
  onMudar: (markdown: string) => void;
  onAbrirTitulo: (titulo: string) => void;
  /** Só leitura: usado onde não se deve editar. */
  travado?: boolean;
}

export default function NoteWysiwyg({
  body, chaveDaNota, onMudar, onAbrirTitulo, travado,
}: Props) {
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
      },
    },
    // Recria o editor ao trocar de nota: mais simples e mais seguro que
    // reaproveitar a instância e sincronizar conteúdo na mão.
    [chaveDaNota]
  );

  useEffect(() => {
    editor?.setEditable(!travado);
  }, [editor, travado]);

  return <EditorContent editor={editor} />;
}
