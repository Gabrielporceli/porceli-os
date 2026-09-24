/**
 * `[[Nota]]` como elemento do editor, e não como texto.
 *
 * SEM ISTO O EDITOR VISUAL CORROMPE O COFRE. Medido nas 108 notas: o
 * serializador do Markdown escapa colchete, então `[[Persuasão]]` volta como
 * `\[\[Persuasão\]\]` — e o link entre notas, que é a navegação do módulo,
 * morre na primeira edição.
 *
 * Como nó atômico, ele entra inteiro e sai inteiro: o editor mostra um chip,
 * o Markdown recebe `[[Persuasão]]` de volta, idêntico ao que entrou.
 *
 * Três caminhos precisam concordar:
 *   1. markdown-it reconhece `[[...]]` e emite um <span data-alvo>;
 *   2. o Tiptap lê esse span e vira o nó (parseHTML);
 *   3. na volta, `serialize` escreve `[[alvo]]` ou `[[alvo|rótulo]]`.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import type MarkdownIt from "markdown-it";
import type { Node as NoProse } from "@tiptap/pm/model";

/** O tiptap-markdown nao exporta o tipo do estado; so precisamos de write. */
interface EstadoDeEscrita { write(texto: string): void }

const ABRE = 0x5b; // [

function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Regra inline do markdown-it: `[[alvo]]`, `[[alvo|rótulo]]`, `[[alvo#seção]]`. */
function pluginWikilink(md: MarkdownIt) {
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const ini = state.pos;
    if (state.src.charCodeAt(ini) !== ABRE || state.src.charCodeAt(ini + 1) !== ABRE) {
      return false;
    }
    const fim = state.src.indexOf("]]", ini + 2);
    if (fim === -1) return false;

    const interno = state.src.slice(ini + 2, fim);
    // Colchete ou quebra dentro é sinal de que não é wikilink — deixa passar
    // pro resto do interpretador em vez de engolir texto alheio.
    if (interno.includes("[") || interno.includes("\n") || !interno.trim()) return false;

    if (!silent) {
      const [alvoBruto, apelido] = interno.split("|");
      // A seção (#) FAZ PARTE do alvo. Tirar aqui obrigaria a reescrever
      // `[[Nota#Secao]]` como `[[Nota|Nota#Secao]]` na volta — texto
      // diferente do que entrou. Quem navega é que descarta o #.
      const alvo = alvoBruto.trim();
      const rotulo = apelido ? apelido.trim() : "";
      const t = state.push("wikilink", "span", 0);
      t.attrs = [["data-alvo", alvo], ["data-rotulo", rotulo]];
    }
    state.pos = fim + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const t = tokens[idx];
    const alvo = t.attrGet("data-alvo") ?? "";
    const rotulo = t.attrGet("data-rotulo") ?? alvo;
    return `<span data-wikilink data-alvo="${escaparHtml(alvo)}" data-rotulo="${escaparHtml(rotulo)}">${escaparHtml(rotulo)}</span>`;
  };
}

export const Wikilink = Node.create({
  name: "wikilink",
  inline: true,
  group: "inline",
  // Átomo: o cursor não entra dentro. Sem isso dá pra apagar metade do alvo
  // e gerar `[[Persua]]`, um link pra nota que não existe.
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      alvo: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-alvo") ?? "",
        renderHTML: (attrs) => ({ "data-alvo": attrs.alvo as string }),
      },
      rotulo: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-rotulo") ?? "",
        renderHTML: (attrs) => ({ "data-rotulo": attrs.rotulo as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wikilink]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const rotulo = (node.attrs.rotulo as string) || (node.attrs.alvo as string);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wikilink": "",
        class:
          "rounded-md bg-primary/25 px-1.5 py-0.5 text-[0.92em] text-white cursor-pointer",
      }),
      rotulo,
    ];
  },

  renderText({ node }) {
    return (node.attrs.rotulo as string) || (node.attrs.alvo as string);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: EstadoDeEscrita, node: NoProse) {
          const alvo = node.attrs.alvo as string;
          const rotulo = node.attrs.rotulo as string;
          // Rótulo igual ao alvo não precisa do `|`; escrever assim mantém o
          // texto idêntico ao original em vez de "melhorar" a sintaxe.
          state.write(rotulo && rotulo !== alvo ? `[[${alvo}|${rotulo}]]` : `[[${alvo}]]`);
        },
        parse: {
          setup(markdownit: MarkdownIt) {
            markdownit.use(pluginWikilink);
          },
        },
      },
    };
  },
});
