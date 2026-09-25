/**
 * Cor dos post-its.
 *
 * A cor sai de um hash do id da nota, e não de um índice de posição: o mural
 * reordena quando você filtra ou busca, e cor por posição faria a mesma nota
 * mudar de cor a cada filtro — perde-se o "aquela amarela ali" que é
 * justamente o que torna um mural mais rápido que uma lista.
 *
 * Tons dessaturados, não papel amarelo de verdade: o fundo do sistema é
 * escuro e a identidade é vidro. Amarelo saturado sobre preto vira lanterna.
 */

export interface CorPostIt {
  /** Fundo do card, já translúcido pra deixar o vidro passar. */
  fundo: string;
  borda: string;
  /** Faixa no topo do card — é o que dá a leitura de "papel colado". */
  fita: string;
}

const PALETA: CorPostIt[] = [
  { fundo: "rgba(104,41,192,0.16)",  borda: "rgba(168,132,255,0.30)", fita: "rgba(168,132,255,0.75)" },
  { fundo: "rgba(30,110,170,0.15)",  borda: "rgba(120,200,255,0.28)", fita: "rgba(120,200,255,0.70)" },
  { fundo: "rgba(25,130,100,0.15)",  borda: "rgba(130,230,190,0.28)", fita: "rgba(130,230,190,0.70)" },
  { fundo: "rgba(170,115,25,0.15)",  borda: "rgba(255,200,120,0.28)", fita: "rgba(255,200,120,0.70)" },
  { fundo: "rgba(175,40,70,0.15)",   borda: "rgba(255,150,170,0.28)", fita: "rgba(255,150,170,0.70)" },
  { fundo: "rgba(90,90,120,0.16)",   borda: "rgba(190,190,220,0.26)", fita: "rgba(190,190,220,0.65)" },
];

/** djb2 — barato e espalha bem o suficiente para 6 baldes. */
function hash(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function corPostIt(id: string): CorPostIt {
  return PALETA[hash(id) % PALETA.length];
}

/**
 * Prévia limpa do corpo, pro card mostrar texto e não código fonte.
 *
 * Tira a marcação toda: no mural não cabe formatar, e `- [ ]`, `|` de tabela
 * e `##` no meio da prévia é exatamente a "linguagem tipada" que polui.
 * Quem quiser o Markdown de verdade abre a nota e clica em escrever.
 */
export function resumo(body: string, limite = 180): string {
  const limpo = body
    .replace(/```[\s\S]*?```/g, " ")        // blocos de código inteiros
    .replace(/^#{1,6}\s+.*$/gm, "")         // títulos: o card já mostra o dele
    .replace(/^\s*\|.*\|\s*$/gm, " ")       // linhas de tabela
    .replace(/^\s*[-:|\s]{3,}\s*$/gm, " ")  // separadores --- e |---|
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, "")  // - [ ] tarefa
    .replace(/^\s*[-*+]\s+/gm, "")          // marcador de lista
    .replace(/^\s*\d+\.\s+/gm, "")          // lista numerada
    .replace(/!?\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, "$1")  // wikilink -> nome
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")         // link md -> texto
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}
