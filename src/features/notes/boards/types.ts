/**
 * Tipos dos quadros — mapa mental e fluxograma.
 *
 * O formato de `nodes`/`edges` é deliberadamente próximo do JSON Canvas do
 * Obsidian (id, x, y, width, height, text) para que exportar depois seja um
 * tradutor e não uma reescrita. Ver docs/NOTAS-OBSIDIAN.md seção 6.
 */

/** Mapa mental e fluxograma compartilham o canvas; muda o vocabulário. */
export type TipoQuadro = "mapa" | "fluxo";

/**
 * Papéis de nó. O mapa mental só usa `ideia` e `central`; o fluxograma usa
 * os quatro de baixo. Um `kind` só, com papéis diferentes, evita dois
 * canvas quase iguais.
 */
export type PapelNo =
  | "central"   // mapa: o nó raiz, de onde tudo parte
  | "ideia"     // mapa: ramificação
  | "inicio"    // fluxo: começo (pílula)
  | "etapa"     // fluxo: ação (retângulo)
  | "decisao"   // fluxo: pergunta sim/não (losango)
  | "fim";      // fluxo: término (pílula)

export interface DadosNo extends Record<string, unknown> {
  texto: string;
  papel: PapelNo;
  /** Índice na paleta. Fixo por nó para a cor não dançar a cada render. */
  cor?: number;
}

export interface NoQuadro {
  id: string;
  type: "quadroNo";
  position: { x: number; y: number };
  data: DadosNo;
}

export interface ArestaQuadro {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** Rótulo da seta — no fluxograma é onde vai "sim" / "não". */
  label?: string | null;
}

export interface Quadro {
  id: string;
  title: string;
  kind: TipoQuadro;
  folder: string;
  nodes: NoQuadro[];
  edges: ArestaQuadro[];
  createdAt: string;
  updatedAt: string;
}

/** Papéis oferecidos na barra de cada tipo de quadro. */
export const PAPEIS_POR_TIPO: Record<TipoQuadro, PapelNo[]> = {
  mapa: ["central", "ideia"],
  fluxo: ["inicio", "etapa", "decisao", "fim"],
};

export const ROTULO_PAPEL: Record<PapelNo, string> = {
  central: "Tema central",
  ideia: "Ideia",
  inicio: "Início",
  etapa: "Etapa",
  decisao: "Decisão",
  fim: "Fim",
};

/**
 * Paleta dos nós. Tons dessaturados porque o fundo é escuro e vidro: cor
 * saturada aqui briga com o roxo da identidade e come a legibilidade do
 * texto branco por cima.
 */
export const CORES_NO = [
  { borda: "rgba(168,132,255,0.55)", fundo: "rgba(104,41,192,0.22)" },
  { borda: "rgba(120,200,255,0.50)", fundo: "rgba(30,110,170,0.20)" },
  { borda: "rgba(130,230,190,0.50)", fundo: "rgba(25,130,100,0.18)" },
  { borda: "rgba(255,200,120,0.50)", fundo: "rgba(170,115,25,0.18)" },
  { borda: "rgba(255,150,170,0.50)", fundo: "rgba(175,40,70,0.18)" },
] as const;

export function corDoNo(indice: number | undefined) {
  return CORES_NO[(indice ?? 0) % CORES_NO.length];
}
