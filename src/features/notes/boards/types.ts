/**
 * Tipos dos quadros — mapa mental e fluxograma.
 *
 * O formato de `nodes`/`edges` é deliberadamente próximo do JSON Canvas do
 * Obsidian (id, x, y, width, height, text) para que exportar depois seja um
 * tradutor e não uma reescrita. Ver docs/NOTAS.md.
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
  /** Forma escolhida no card. Sem ela (quadros antigos), vale a do papel. */
  forma?: FormaNo;
}

/** Formas padrão de fluxograma e mapa mental. */
export type FormaNo = "retangulo" | "pilula" | "circulo" | "losango" | "triangulo";

export const FORMAS: { id: FormaNo; rotulo: string }[] = [
  { id: "retangulo", rotulo: "Retângulo" },
  { id: "pilula", rotulo: "Pílula" },
  { id: "circulo", rotulo: "Círculo" },
  { id: "losango", rotulo: "Losango" },
  { id: "triangulo", rotulo: "Triângulo" },
];

/** A forma que o papel sugere: losango é decisão, pílula é começo e fim. */
const FORMA_DO_PAPEL: Record<PapelNo, FormaNo> = {
  central: "retangulo", ideia: "retangulo", inicio: "pilula", etapa: "retangulo", decisao: "losango", fim: "pilula",
};

export function formaDoNo(d: Pick<DadosNo, "papel" | "forma">): FormaNo {
  return d.forma ?? FORMA_DO_PAPEL[d.papel];
}

/** Tamanho do card. Losango e círculo precisam ser quadrados. */
export function tamanhoDoNo(d: Pick<DadosNo, "papel" | "forma">): { w: number; h: number } {
  const base = {
    retangulo: { w: 170, h: 66 },
    pilula: { w: 150, h: 56 },
    circulo: { w: 120, h: 120 },
    losango: { w: 150, h: 150 },
    triangulo: { w: 170, h: 140 },
  }[formaDoNo(d)];
  // O tema central do mapa mental é um pouco maior que as ideias.
  return d.papel === "central" ? { w: Math.round(base.w * 1.12), h: Math.round(base.h * 1.15) } : base;
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
