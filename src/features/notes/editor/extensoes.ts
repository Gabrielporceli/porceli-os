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
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Wikilink } from "./Wikilink";

export function extensoesDaNota() {
  return [
    StarterKit,
    // Sem TaskList/TaskItem o `- [ ]` vira texto solto e o serializador
    // escapa os colchetes: `- \[ \] fazer`. Medido — some o checklist.
    TaskList,
    TaskItem.configure({ nested: true }),
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
    Markdown.configure({ html: false, transformPastedText: true, linkify: false, tightLists: true }),
  ];
}

/** Atalho tipado pro getMarkdown, que o tiptap-markdown pendura no storage. */
export function markdownDoEditor(editor: { storage: unknown }): string {
  return (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
}
