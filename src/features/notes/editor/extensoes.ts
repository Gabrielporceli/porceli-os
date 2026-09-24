/**
 * As extensões do editor, num lugar só.
 *
 * O medidor de ida e volta (/dev/roundtrip) usa ESTA lista. Se ele usasse uma
 * cópia, estaria aprovando uma configuração que não é a que roda — e o dia em
 * que as duas divergirem é o dia em que o editor come o texto em silêncio.
 */
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Wikilink } from "./Wikilink";
import { QuebraLeve } from "./QuebraLeve";

export function extensoesDaNota() {
  return [
    // `hardBreak: false` pra QuebraLeve assumir o lugar dele.
    StarterKit.configure({ hardBreak: false }),
    QuebraLeve,
    // Sem TaskList/TaskItem o `- [ ]` vira texto solto e o serializador
    // escapa os colchetes: `- \[ \] fazer`. Medido — some o checklist.
    TaskList,
    TaskItem.configure({ nested: true }),
    // Sem Image, `![alt](foto.png)` nao existe no esquema e o editor
    // APAGA a imagem inteira. Nenhuma nota usa hoje, mas basta colar uma.
    Image,
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    Link.configure({ openOnClick: false, autolink: false }),
    Wikilink,
    // `html: false` de propósito: nota é texto de fora, e aceitar HTML cru
    // aqui reabriria o buraco que a leitura já fechou.
    // `tightLists` mantem os itens colados, como no original. Sem isso o
    // serializador poe uma linha em branco entre cada item da lista.
    Markdown.configure({ html: false, transformPastedText: true, linkify: false, tightLists: true, breaks: true }),
  ];
}

/**
 * Desfaz o escape que o serializador põe a mais, FORA de código.
 *
 * O serializador escapa caracteres que em Markdown só têm significado em
 * certas posições. Resultado medido no cofre: `Oi, [Nome]!` dos seus scripts
 * voltava `Oi, \[Nome\]!`, `~154M` virava `\~154M` e `| # |` virava `| \# |`.
 * Nada disso muda o que aparece na tela, mas suja o texto a cada gravação.
 *
 * PULAR CÓDIGO NÃO É DETALHE. A nota `Ideias de Conteúdo` tem uma consulta
 * `dataview` cheia de expressão regular — `"\s*\[cat::[^\]]*\]"`. Fazer a
 * troca na saída inteira arrancaria as barras de lá e quebraria a consulta.
 * Dentro de crase, escape é conteúdo.
 */
function desescaparForaDeCodigo(texto: string): string {
  // Divide preservando os delimitadores: cerca ``` e crase simples.
  return texto
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((parte, i) => (i % 2 === 1 ? parte : parte.replace(/\\([[\]~#])/g, "$1")))
    .join("");
}

/** O Markdown que sai do editor — ponto único de saída. */
export function markdownDoEditor(editor: { storage: unknown }): string {
  const bruto = (editor.storage as { markdown: { getMarkdown: () => string } })
    .markdown.getMarkdown();
  return desescaparForaDeCodigo(bruto);
}
