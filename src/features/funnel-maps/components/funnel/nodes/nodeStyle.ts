/**
 * Cores dos cards do funil = as do Dashboard, SÓLIDAS (sem o vidro, que
 * atrapalha a leitura de números num mapa cheio de cards e linhas).
 *
 * O fundo do mapa é preto, então os cards são majoritariamente CLAROS, como o
 * card "Saúde do negócio": #F4F4F4 com texto #2F2D2E, verde/vermelho escuros.
 * O roxo #6829C0 fica só no passo de conversão (o que tem ticket), a meta do
 * funil, como o card de destaque do Dashboard — e aí o texto é branco.
 */
export interface Tone {
  card: string;
  text: string;
  /** Texto de apoio (rótulos de linha). */
  muted: string;
  /** Rótulos em maiúsculas e dicas. */
  caption: string;
  /** Faixa de entradas no topo do card. */
  strip: string;
  /** Campo da taxa na faixa. */
  pill: string;
  /** Faixa do navegador e blocos de apoio. */
  chrome: string;
  /** Traços do esboço de página. */
  sketch: string;
  up: string;
  down: string;
}

const LIGHT: Tone = {
  card: 'border-black/10 bg-[#F4F4F4]',
  text: 'text-[#2F2D2E]',
  muted: 'text-[#2F2D2E]/60',
  caption: 'text-[#2F2D2E]/50',
  strip: 'border-black/[0.08] bg-black/[0.05]',
  pill: 'bg-[#6829C0] text-white ring-1 ring-black/10',
  chrome: 'border-black/[0.08] bg-black/[0.05]',
  sketch: 'bg-black/10',
  up: 'text-green-600',
  down: 'text-red-600',
};

const ACCENT: Tone = {
  card: 'border-white/15 bg-[#6829C0]',
  text: 'text-white',
  muted: 'text-white/60',
  caption: 'text-white/50',
  strip: 'border-white/10 bg-white/[0.12]',
  pill: 'bg-white/20 text-white ring-1 ring-white/20',
  chrome: 'border-white/10 bg-white/[0.12]',
  sketch: 'bg-white/20',
  up: 'text-green-300',
  down: 'text-red-300',
};

export function toneFor(data: { avgTicket?: number }): Tone {
  return (data.avgTicket ?? 0) > 0 ? ACCENT : LIGHT;
}

export function cardSurface(tone: Tone): string {
  return `rounded-2xl border shadow-lg shadow-black/40 ${tone.card}`;
}

/** Balão de campos que abre ao lado do card: claro, como o card padrão. */
export const POPOVER_SURFACE = 'rounded-2xl border border-black/10 bg-[#F4F4F4] shadow-xl shadow-black/40';

/** Seleção por contorno, que não briga com a borda do card. */
export const SELECTED_OUTLINE = 'outline outline-2 outline-offset-2 outline-[#8B5CF6]';
