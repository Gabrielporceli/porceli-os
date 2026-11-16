/**
 * Geometria da "gota" que escorre da Ilha Dinâmica do iPhone e vira um cartão.
 *
 * É a conta do repositório rit3zh/expo-dynamic-notifications (MIT), que faz
 * isso em React Native + Skia, trazida pra web sem mudar os números: os
 * mesmos tamanhos, o mesmo perfil do pescoço e as mesmas molas. Lá quem
 * desenha é um canvas Skia; aqui são três <div> pretas dentro de um filtro
 * SVG "gooey" (ver IlhaDinamica.tsx).
 *
 * Dois progressos, de 0 a 1, dirigem tudo:
 *   • `drop`   — a gota nasce na ilha, estica um pescoço e desce até o
 *                lugar do cartão;
 *   • `expand` — a gota se abre no cartão.
 */

// Medidas da ilha (iPhone 14 Pro em diante, em pontos CSS).
export const ISLAND_WIDTH = 126;
export const ISLAND_HEIGHT = 37.33;
/** Distância entre o fim da ilha e o fim da área segura do topo. */
const ISLAND_TOP = 11;
const ISLAND_MIN_TOP = 12;

const CARD_MAX_WIDTH = 396;
const CARD_HEIGHT = 74;
const CARD_MARGIN = 16;
const CARD_GAP = 34;
const DROP_SIZE = 52;
const NECK_WIDTH = 60;
const CANVAS_PADDING = 96;
const EDGE_MARGIN = 10;

const DROP_GROW_SPAN = 0.7;
const DROP_GROW_POWER = 1.25;
const DROP_STRETCH = 0.38;
const NECK_BREAK = 0.82;
const NECK_RISE = 1.6;
const NECK_FALL = 1.4;

/** Conteúdo do cartão começa nesta escala e chega em 1 ao aparecer. */
export const CONTENT_MIN_SCALE = 0.88;

/** Tempos da entrada e da saída, em segundos (os mesmos do original). */
export const TEMPOS = {
  drop: { duration: 1.15, bounce: 0.18 },
  expand: { duration: 1.0, bounce: 0.2, delay: 0.34 },
  reveal: { duration: 0.7, bounce: 0, delay: 0.56 },
  fade: { duration: 0.36, bounce: 0 },
  collapse: { duration: 0.66, bounce: 0.08, delay: 0.1 },
  volta: { duration: 1.15, bounce: 0.1, delay: 0.28 },
  /** Quanto o aviso fica aberto antes de recolher sozinho (ms). */
  permanencia: 3600,
} as const;

export interface IlhaLayout {
  width: number;
  centerX: number;
  islandWidth: number;
  islandHeight: number;
  islandTop: number;
  islandBottom: number;
  islandRadius: number;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  cardTop: number;
  cardLeft: number;
  cardCenterY: number;
  canvasHeight: number;
}

export interface IlhaGeometria {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  neckX: number;
  neckY: number;
  neckWidth: number;
  neckHeight: number;
  /** Deslocamento do conteúdo em relação ao lugar final do cartão. */
  offsetY: number;
  /** Largura atual ÷ largura final: passa de 1 no "quique" da mola. */
  widthRatio: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const mix = (t: number, a: number, b: number) => a + (b - a) * t;
const easeOutPower = (p: number, power: number) => 1 - Math.pow(1 - clamp(p, 0, 1), power);

/** Sino assimétrico: o pescoço engrossa, afina e some quando a gota solta. */
function neckProfile(progress: number, rise: number, fall: number) {
  const t = clamp(progress, 0, 1);
  if (t <= 0 || t >= 1) return 0;
  const peak = rise / (rise + fall);
  const normal = Math.pow(peak, rise) * Math.pow(1 - peak, fall);
  return (Math.pow(t, rise) * Math.pow(1 - t, fall)) / normal;
}

/**
 * Onde fica a ilha e onde o cartão vai parar.
 *
 * `insetTop` é a área segura do topo (env(safe-area-inset-top)). Num iPhone
 * com ilha ela vale ~59 e a ilha fica a ~11px do topo. Sem ilha (`temIlha`
 * falso: Android, iPhone com notch, navegador do computador) a "ilha" é
 * posta logo acima da borda da tela, e a gota simplesmente desce do topo.
 */
export function ilhaLayout(width: number, insetTop: number, temIlha: boolean): IlhaLayout {
  const islandTop = temIlha
    ? Math.max(insetTop - ISLAND_HEIGHT - ISLAND_TOP, ISLAND_MIN_TOP)
    : -ISLAND_HEIGHT;
  const islandBottom = islandTop + ISLAND_HEIGHT;
  const cardWidth = Math.min(width - CARD_MARGIN * 2, CARD_MAX_WIDTH);
  // Sem ilha o cartão para logo abaixo da área segura, não 34px depois de
  // uma ilha que não existe.
  const cardTop = temIlha ? islandBottom + CARD_GAP : Math.max(insetTop, 0) + 12;
  return {
    width,
    centerX: width / 2,
    islandWidth: ISLAND_WIDTH,
    islandHeight: ISLAND_HEIGHT,
    islandTop,
    islandBottom,
    islandRadius: ISLAND_HEIGHT / 2,
    cardWidth,
    cardHeight: CARD_HEIGHT,
    cardRadius: CARD_HEIGHT / 2,
    cardTop,
    cardLeft: (width - cardWidth) / 2,
    cardCenterY: cardTop + CARD_HEIGHT / 2,
    canvasHeight: cardTop + CARD_HEIGHT + CANVAS_PADDING,
  };
}

export function ilhaGeometria(drop: number, expand: number, layout: IlhaLayout): IlhaGeometria {
  const grow = easeOutPower(clamp(drop / DROP_GROW_SPAN, 0, 1), DROP_GROW_POWER);
  const neck = neckProfile(drop / NECK_BREAK, NECK_RISE, NECK_FALL);

  const stretch = 1 + DROP_STRETCH * neck;
  const droplet = DROP_SIZE * grow;

  const width = Math.max(
    0,
    Math.min(mix(expand, droplet / stretch, layout.cardWidth), layout.width - EDGE_MARGIN * 2),
  );
  const height = Math.max(0, mix(expand, droplet * stretch, layout.cardHeight));
  const radius = Math.max(
    0,
    Math.min(mix(expand, droplet * 0.5, layout.cardRadius), Math.min(width, height) / 2),
  );

  const originY = layout.islandBottom - layout.islandHeight * 0.34;
  const centerY = mix(drop, originY, layout.cardCenterY);

  const neckWidth = Math.min(NECK_WIDTH, width) * neck;
  const neckY = layout.islandBottom - layout.islandHeight * 0.5;

  return {
    x: layout.centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    radius,
    neckX: layout.centerX - neckWidth / 2,
    neckY,
    neckWidth,
    neckHeight: Math.max(centerY - neckY, 0),
    offsetY: centerY - layout.cardCenterY,
    widthRatio: layout.cardWidth > 0 ? width / layout.cardWidth : 0,
  };
}
