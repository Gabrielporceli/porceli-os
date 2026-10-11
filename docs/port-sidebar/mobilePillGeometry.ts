/**
 * Geometria da pílula do menu mobile — "transferência de líquido".
 *
 * Pura (sem DOM): recebe as bordas esquerdas do ícone-ÂNCORA (ax) e do
 * ícone-CANDIDATO (nx), a largura do slot e o progresso p do candidato
 * rumo ao centro (0 = acabou de virar o mais próximo do centro, 1 =
 * centro exato), e devolve as três peças: bolha de trás, bolha da frente
 * e pescoço. Compartilhada entre o Header (uso real) e a página de
 * laboratório /dev/pill (calibração frame a frame) — o que se ajusta lá
 * é exatamente o que roda no menu.
 *
 * Contínua por construção: em p = SWITCH_AT só existe a bolha da frente,
 * cheia, no candidato — idêntica à geometria "parada" —, então trocar a
 * âncora nesse instante não muda nada na tela.
 */

/**
 * Medidas da faixa de ícones do menu mobile. Ficam aqui (e não soltas no
 * Header) porque a pílula é desenhada por FORA do <nav> e posicionada em
 * pixels: se o slot do ícone e a janela divergirem, ela desalinha. O
 * laboratório /dev/pill usa as mesmas constantes.
 */
/** lado do slot de cada ícone (px) — no Tailwind: h-10 w-10 */
export const MOBILE_SLOT = 40;
/** vão entre ícones (px) — no Tailwind: gap-1 */
export const MOBILE_GAP = 4;
/** quantos ícones ficam visíveis na janela */
export const MOBILE_VISIBLE = 5;
/** largura da janela = 5 slots + 4 vãos = 216px */
export const MOBILE_WINDOW = MOBILE_VISIBLE * MOBILE_SLOT + (MOBILE_VISIBLE - 1) * MOBILE_GAP;

export type Ball = { x: number; s: number };
export type Neck = { x: number; w: number; h: number };
export type PillGeom = { back: Ball; front: Ball; neck: Neck };

export type PillTuning = {
  /** bolha da frente termina de crescer */
  FRONT_DONE_AT: number;
  /** bolha de trás começa a encolher */
  BACK_START_AT: number;
  /** bolha de trás some; âncora troca (sem salto) */
  SWITCH_AT: number;
  /** altura do pescoço, fração do slot */
  NECK_H: number;
  /** pescoço termina de "nascer" */
  NECK_RISE_AT: number;
  /** gooey: stdDeviation do blur (px) — quanto maior, mais "grudento" */
  GOO_BLUR: number;
  /** gooey: ganho do alfa na feColorMatrix */
  GOO_K: number;
  /** gooey: corte do alfa (o "estalo" — maior = separa mais cedo) */
  GOO_O: number;
  // O material (fill, hairline, bisel) NÃO tem parâmetros aqui: é uma
  // réplica geométrica exata da .lqg-lens--nav — ver NAV_INSETS em
  // MobilePillBlob.tsx.
};

export const PILL_DEFAULTS: PillTuning = {
  FRONT_DONE_AT: 0.55,
  BACK_START_AT: 0.4,
  SWITCH_AT: 0.92,
  NECK_H: 0.3,
  NECK_RISE_AT: 0.2,
  // Ajustados medindo pixel a pixel contra o CSS real (.lqg-lens--nav
  // rasterizado via foreignObject) no laboratório /dev/pill: estes
  // minimizam a diferença de alfa (Δα médio ~1,3%, quase todo no
  // antisserrilhado da borda).
  GOO_BLUR: 4,
  GOO_K: 11,
  GOO_O: 4.6,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2);

/** Geometria "parada": só uma bolha cheia no ícone. */
export function idlePillGeom(x: number, slot: number): PillGeom {
  return {
    back: { x, s: 1 },
    front: { x, s: 0 },
    neck: { x: x + slot / 2, w: 0, h: 0 },
  };
}

export function transferPillGeom(
  ax: number,
  nx: number,
  slot: number,
  p: number,
  t: PillTuning = PILL_DEFAULTS
): PillGeom {
  const dx = nx - ax;

  // Vizinho ou não? No mobile o passo é sempre de um ícone (slot + vão);
  // no desktop a pílula pode pular meia barra (Dashboard → Agendamentos).
  // slot * 1.3 fica confortavelmente entre um passo (slot + vão ≈ 1,1·slot)
  // e dois (≈ 2,2·slot).
  const oneStep = slot * 1.3;

  // SALTO LONGO: sem pescoço. Esticar o fio por meia barra fica feio — a
  // pílula vira uma minhoca atravessando o menu. Aqui as duas bolhas são
  // independentes: a da origem encolhe e a do destino cresce AO MESMO
  // TEMPO, com o mesmo material. Como ficam longe uma da outra, o filtro
  // gooey não as funde, que é justamente o "desgrudar" desejado.
  if (Math.abs(dx) > oneStep) {
    // Normalizado por SWITCH_AT: em p = SWITCH_AT a bolha da frente está
    // cheia no destino e a de trás sumiu — idêntico à geometria parada.
    // É isso que deixa trocar a âncora naquele instante sem salto na tela.
    const e = easeInOut(clamp01(p / t.SWITCH_AT));
    return {
      back: { x: ax, s: 1 - e },
      front: { x: nx, s: e },
      neck: { x: nx + slot / 2, w: 0, h: 0 },
    };
  }

  // --- daqui pra baixo: salto de UM ícone, a transferência com pescoço ---

  // Frente: cresce cedo e rápido, assenta suave.
  const sFront = easeOut(clamp01(p / t.FRONT_DONE_AT));
  // Trás: segura, depois encolhe acelerando — o "drenar" da bolha antiga.
  const sBack = 1 - easeIn(clamp01((p - t.BACK_START_AT) / (t.SWITCH_AT - t.BACK_START_AT)));
  // Pescoço: nasce junto com a frente, pinça junto com a trás.
  const rise = easeOut(clamp01(p / t.NECK_RISE_AT));
  const fall = 1 - easeIn(clamp01((p - t.FRONT_DONE_AT) / (t.SWITCH_AT - t.FRONT_DONE_AT)));
  // Espessura cheia: aqui o salto é sempre de um ícone só. (O afinamento
  // por esticamento que existia antes virou código morto quando o salto
  // longo passou a sair pelo caminho de cima, sem pescoço nenhum.)
  const neckH = slot * t.NECK_H * rise * fall;

  // Pescoço vai da borda da bolha de trás até a borda da bolha da frente
  // (1px pra dentro de cada, pra não deixar fresta de sub-pixel — no
  // vidro translúcido, sobrepor mais que isso viraria mancha clara).
  const r = slot / 2;
  const backC = ax + r;
  const frontC = nx + r;
  const rBack = sBack * r;
  const rFront = sFront * r;
  const neckStart = dx >= 0 ? backC + rBack - 1 : frontC + rFront - 1;
  const neckEnd = dx >= 0 ? frontC - rFront + 1 : backC - rBack + 1;
  const neckW = Math.max(0, neckEnd - neckStart);

  return {
    back: { x: ax, s: sBack },
    front: { x: nx, s: sFront },
    neck: { x: neckStart, w: neckW, h: neckH },
  };
}
