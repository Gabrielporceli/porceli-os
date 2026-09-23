/**
 * Formato de armazenamento das notas: Markdown + frontmatter YAML.
 *
 * Este módulo é a decisão de arquitetura da página de Notas. O Obsidian não
 * tem API nem nuvem: um cofre é uma pasta de arquivos `.md` no disco, os
 * metadados são frontmatter YAML e os links são `[[wikilinks]]`. Qualquer
 * caminho de sincronização (Git, File System Access, plugin REST) transporta
 * ESTES arquivos. Por isso o formato vem antes do transporte — se a nota
 * nascesse como HTML ou como documento proprietário de editor, a ponte com o
 * Obsidian viraria conversão com perda.
 *
 * Três decisões que valem explicar:
 *
 *  1. `tags` fica na RAIZ do frontmatter, não dentro do nosso namespace.
 *     É uma chave que o Obsidian reconhece nativamente — assim as notas do
 *     CRM aparecem no painel de tags e nas buscas dele sem nada extra.
 *
 *  2. O resto dos nossos campos vive sob `porceli:`. Frontmatter é território
 *     compartilhado com plugins (Dataview, Templater, Kanban…); cravar chaves
 *     soltas como `client` ou `id` na raiz é pedir colisão.
 *
 *  3. CHAVES DESCONHECIDAS SÃO PRESERVADAS. Se você abrir a nota no Obsidian
 *     e adicionar `aliases:` ou um campo de Dataview, o round-trip tem que
 *     devolver isso intacto. Sem essa regra, a sincronização de duas mãos
 *     apaga em silêncio o que foi escrito do outro lado — que é a pior falha
 *     possível num sistema de notas.
 */
import { dump, load } from "js-yaml";

/** Namespace dos campos que são nossos, e não do Obsidian. */
const NS = "porceli";

export interface Note {
  id: string;
  title: string;
  /** Markdown puro — sem frontmatter. */
  body: string;
  /** Caminho da pasta dentro do cofre, ex.: "Clientes/Acme". Vazio = raiz. */
  folder: string;
  tags: string[];
  clientId?: string | null;
  leadId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /**
   * Chaves de frontmatter que não são nossas nem do conjunto conhecido.
   * Guardadas para devolver intactas na escrita — ver decisão (3).
   */
  extraFrontmatter?: Record<string, unknown>;
}

/* ────────────────────────────── escrita ────────────────────────────── */

/** Monta o arquivo `.md` completo (frontmatter + corpo) de uma nota. */
export function toMarkdown(note: Note): string {
  const fm: Record<string, unknown> = { ...(note.extraFrontmatter ?? {}) };

  // Ordem importa só para o diff no Git ficar legível: as chaves estáveis
  // primeiro, as nossas por último.
  if (note.tags.length) fm.tags = [...note.tags];
  else delete fm.tags;

  const meu: Record<string, unknown> = { id: note.id };
  if (note.clientId) meu.client = note.clientId;
  if (note.leadId) meu.lead = note.leadId;
  if (note.createdAt) meu.created = note.createdAt;
  if (note.updatedAt) meu.updated = note.updatedAt;
  fm[NS] = meu;

  const yaml = dump(fm, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd();
  const corpo = note.body.replace(/^﻿/, "").trimEnd();
  return `---\n${yaml}\n---\n\n${corpo}\n`;
}

/* ────────────────────────────── leitura ────────────────────────────── */

/** Chaves que consumimos da raiz; as demais voltam em `extraFrontmatter`. */
const CONHECIDAS = new Set(["tags", NS]);

export interface ParsedNote extends Omit<Note, "id" | "folder"> {
  /** Ausente quando o arquivo foi criado à mão no Obsidian, sem nosso id. */
  id: string | null;
}

/**
 * Lê um arquivo `.md`. Tolerante de propósito: arquivo sem frontmatter, com
 * YAML quebrado ou escrito à mão no Obsidian ainda vira nota — o corpo nunca
 * se perde. `id` volta nulo quando o arquivo não é nosso, e aí quem chama
 * decide se adota (gera id) ou ignora.
 */
export function fromMarkdown(texto: string, tituloPadrao = "Sem título"): ParsedNote {
  const limpo = texto.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(limpo);

  let fm: Record<string, unknown> = {};
  let corpo = limpo;
  if (m) {
    corpo = limpo.slice(m[0].length);
    try {
      const lido = load(m[1]);
      if (lido && typeof lido === "object" && !Array.isArray(lido)) {
        fm = lido as Record<string, unknown>;
      }
    } catch {
      // YAML inválido: trata como nota sem metadados em vez de estourar.
      // Perder o corpo por causa de um dois-pontos torto seria inaceitável.
    }
  }

  const meu = (fm[NS] ?? {}) as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) if (!CONHECIDAS.has(k)) extra[k] = v;

  return {
    id: typeof meu.id === "string" ? meu.id : null,
    title: tituloPadrao,
    body: corpo.replace(/^\r?\n+/, "").trimEnd(),
    tags: normalizarTags(fm.tags),
    clientId: typeof meu.client === "string" ? meu.client : null,
    leadId: typeof meu.lead === "string" ? meu.lead : null,
    createdAt: aTexto(meu.created),
    updatedAt: aTexto(meu.updated),
    extraFrontmatter: Object.keys(extra).length ? extra : undefined,
  };
}

/** O Obsidian aceita `tags: a, b`, lista YAML ou uma string só. */
function normalizarTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** O js-yaml converte datas ISO em Date; devolvemos sempre texto. */
function aTexto(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? v : null;
}

/* ─────────────────────────── caminho no cofre ─────────────────────────── */

/** Caracteres que o Obsidian não aceita em nome de arquivo. */
const PROIBIDOS = /[*"\\/<>:|?#^[\]]/g;

/** Título → nome de arquivo seguro, preservando acentos (o Obsidian aceita). */
export function tituloParaArquivo(titulo: string): string {
  const limpo = titulo.replace(PROIBIDOS, "").replace(/\s+/g, " ").trim();
  // Ponto no fim quebra no Windows; nome vazio viraria ".md".
  return (limpo.replace(/\.+$/, "") || "Sem título").slice(0, 120);
}

/** Caminho completo do arquivo dentro do cofre, ex.: "Clientes/Acme/Reunião.md". */
export function caminhoNoCofre(note: Pick<Note, "title" | "folder">): string {
  const pasta = note.folder
    .split("/")
    .map((p) => p.replace(PROIBIDOS, "").trim())
    .filter(Boolean)
    .join("/");
  const arquivo = `${tituloParaArquivo(note.title)}.md`;
  return pasta ? `${pasta}/${arquivo}` : arquivo;
}

/* ────────────────────────────── wikilinks ────────────────────────────── */

/**
 * Extrai os alvos de `[[Nota]]`, `[[Nota|apelido]]` e `[[Nota#seção]]`.
 * É o que permite montar o grafo de notas depois — e é o mesmo formato que
 * o Obsidian usa, então links criados de um lado funcionam do outro.
 */
export function extrairWikilinks(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const alvo = m[1].split("|")[0].split("#")[0].trim();
    if (alvo && !out.includes(alvo)) out.push(alvo);
  }
  return out;
}
