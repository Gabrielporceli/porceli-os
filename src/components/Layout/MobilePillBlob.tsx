import { useMemo } from "react";
import type { PillGeom, PillTuning } from "./mobilePillGeometry";
import { PILL_DEFAULTS } from "./mobilePillGeometry";

/**
 * Pílula do menu mobile como UMA forma só, com gooey effect E o material
 * de vidro líquido — os dois gerados dentro do mesmo SVG.
 *
 * Por que não CSS: o material do botão ativo (.lqg-lens--nav) é fill
 * translúcido + bisel feito de box-shadow inset — e box-shadow segue a
 * CAIXA retangular do elemento, nunca uma silhueta. Mascarar mantinha o
 * fill mas cortava o bisel (pescoço e junções chapados). E aplicar o
 * filtro gooey direto no vidro não dá (fill com alfa 0,13 zera a matriz;
 * o blur destrói o bisel).
 *
 * Tentativa anterior aproximava o bisel com feSpecularLighting (física de
 * iluminação): chegou perto, mas "perto" não é idêntico. Esta versão
 * REPLICA o CSS geometricamente — mesma ideia do DeconstructedCard
 * (deconstructed-card.tsx), que reproduz os insets do .liquid-glass com
 * máscaras SVG.
 *
 * Um `box-shadow inset dx dy blur spread cor` é, por definição, a faixa
 * entre a forma e uma CÓPIA dela encolhida pelo spread e deslocada por
 * (dx, dy), desfocada pelo blur, pintada na cor e recortada na forma. Em
 * primitivas de filtro:
 *   feMorphology (spread) → feOffset (dx,dy) → feComposite out (faixa)
 *   → feGaussianBlur (blur/2) → feComposite in (recorte) → feFlood (cor).
 * A sombra externa é o inverso: a forma deslocada/desfocada, só do lado
 * de fora. Os números abaixo são os MESMOS da .lqg-lens--nav em
 * index.css — se aquele CSS mudar, NAV_INSETS tem que acompanhar.
 *
 * O resultado vira background-image (data URI) de um <div> que cobre a
 * janela da faixa. Sem transition CSS — a suavidade vem do scroll
 * atualizando a geometria a cada frame.
 */

// --glass-reflex-light / --glass-reflex-dark do .lqg-lens (index.css)
const REFLEX_LIGHT = 0.65;
const REFLEX_DARK = 1;

type Inset = { dx: number; dy: number; blur: number; spread: number; white: boolean; a: number };

// Ordem = a do CSS (primeira sombra fica POR CIMA das seguintes).
const NAV_INSETS: Inset[] = [
  { dx: 0,    dy: 0,    blur: 0, spread: 1,  white: true,  a: REFLEX_LIGHT * 0.10 },
  { dx: 1.8,  dy: 3,    blur: 0, spread: -2, white: true,  a: REFLEX_LIGHT * 0.90 },
  { dx: -2,   dy: -2,   blur: 0, spread: -2, white: true,  a: REFLEX_LIGHT * 0.80 },
  { dx: -3,   dy: -8,   blur: 1, spread: -6, white: true,  a: REFLEX_LIGHT * 0.60 },
  { dx: -0.3, dy: -1,   blur: 4, spread: 0,  white: false, a: REFLEX_DARK * 0.12 },
  { dx: -1.5, dy: 2.5,  blur: 0, spread: -2, white: false, a: REFLEX_DARK * 0.20 },
  { dx: 0,    dy: 3,    blur: 4, spread: -2, white: false, a: REFLEX_DARK * 0.20 },
  { dx: 2,    dy: -6.5, blur: 1, spread: -4, white: false, a: REFLEX_DARK * 0.10 },
];
/** 0px 1px 3px 0px black 5% */
const NAV_OUTER = { dx: 0, dy: 1, blur: 3, a: REFLEX_DARK * 0.05 };
/** background-color: rgba(255,255,255,0.13) */
const NAV_FILL_A = 0.13;

/** erf (Abramowitz–Stegun 7.1.26) + normal padrão — usados pra calcular o
 *  limiar que desloca o contorno exatamente `spread` px (ver insetParams). */
const erf = (x: number) => {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
};
const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const normalPdf = (z: number) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);

/**
 * Parâmetros do "spread" circular: deslocar o contorno da silhueta em
 * |spread| px usando blur gaussiano + limiar (isotrópico, ao contrário da
 * feMorphology, que é retangular).
 *
 * Duas correções que só apareceram medindo contra o CSS real:
 *  • CURVATURA — a gaussiana encolhe um disco de raio R em ~σ²/(2R), então
 *    o limiar tem que mirar `d + σ²/(2R)`, não `d`. Sem isso o spread -6
 *    errava quase 1px e a base da pílula ficava escura demais.
 *  • INCLINAÇÃO — a rampa do limiar precisa escalar com σ pra borda sair
 *    com ~1px de antisserrilhado. Com inclinação fixa, o spread -6 gerava
 *    uma transição de ~3px: era o "gradiente" visível na base.
 */
const insetParams = (spread: number, radius: number) => {
  const d = Math.abs(spread);
  const sigma = d;
  const z = (1 + d / (2 * radius)) * (spread > 0 ? 1 : -1);
  return { sigma, thr: normalCdf(z), slope: sigma / normalPdf(z) };
};

export function MobilePillBlob({
  geom,
  windowW,
  slot,
  tuning = PILL_DEFAULTS,
}: {
  geom: PillGeom;
  windowW: number;
  slot: number;
  tuning?: PillTuning;
}) {
  const image = useMemo(() => {
    const t = tuning;
    const r = slot / 2;
    const cy = r;
    const { back, front, neck } = geom;
    const f2 = (v: number) => v.toFixed(2);
    const shapes: string[] = [];
    if (back.s > 0.001) shapes.push(`<circle cx='${f2(back.x + r)}' cy='${cy}' r='${f2(back.s * r)}'/>`);
    if (front.s > 0.001) shapes.push(`<circle cx='${f2(front.x + r)}' cy='${cy}' r='${f2(front.s * r)}'/>`);
    if (neck.w > 0.5 && neck.h > 0.5) {
      shapes.push(
        `<rect x='${f2(neck.x)}' y='${f2(cy - neck.h / 2)}' width='${f2(neck.w)}' height='${f2(neck.h)}' rx='${f2(neck.h / 2)}'/>`
      );
    }

    // Um inset, do jeito que o CSS realmente calcula:
    //   1. buraco = forma com o spread aplicado, deslocada por (dx,dy)
    //      — spread > 0 encolhe o buraco (ERODE), < 0 aumenta (DILATE);
    //   2. a cor preenche TUDO FORA do buraco (região ilimitada);
    //   3. esse complemento é desfocado;
    //   4. e só ENTÃO recortado na forma.
    // A ordem importa muito: desfocar a faixa fina (forma ∩ fora-do-buraco)
    // e depois recortar — como eu fazia antes — dá uma sombra ~3× mais
    // fraca, porque a massa que vinha "de fora" some. Medido pixel a
    // pixel contra o CSS real (foreignObject) no laboratório.
    const inset = (s: Inset, i: number) => {
      // spread NÃO pode usar feMorphology: o kernel dela é RETANGULAR, então
      // "engordar 2px" avança 2,83px nas diagonais — medido, era a maior
      // fonte de erro contra o CSS (Δα ~0,45 justamente a 45°). O spread do
      // CSS é circular; aqui o contorno é deslocado com blur + limiar
      // (gaussiana é isotrópica). Os números saem de insetParams, que
      // corrige curvatura e inclinação da rampa — ver lá.
      const morph = s.spread === 0
        ? ""
        : (() => {
            const { sigma, thr, slope } = insetParams(s.spread, r);
            return (
              `<feGaussianBlur in='hard' stdDeviation='${sigma}' result='mb${i}'/>` +
              `<feColorMatrix in='mb${i}' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${slope.toFixed(2)} ${(0.5 - slope * thr).toFixed(4)}' result='h${i}'/>`
            );
          })();
      const holeIn = s.spread === 0 ? "goo" : `h${i}`;
      const off = `<feOffset in='${holeIn}' dx='${s.dx}' dy='${s.dy}' result='o${i}'/>`;
      // complemento do buraco dentro da região do filtro
      const comp = `<feComposite in='full' in2='o${i}' operator='out' result='b${i}'/>`;
      const blur = s.blur > 0
        ? `<feGaussianBlur in='b${i}' stdDeviation='${(s.blur / 2).toFixed(2)}' result='g${i}'/>`
        : "";
      const src = s.blur > 0 ? `g${i}` : `b${i}`;
      const clip = `<feComposite in='${src}' in2='goo' operator='in' result='c${i}'/>`;
      const color =
        `<feFlood flood-color='${s.white ? "#fff" : "#000"}' flood-opacity='${s.a.toFixed(3)}' result='f${i}'/>` +
        `<feComposite in='f${i}' in2='c${i}' operator='in' result='s${i}'/>`;
      return morph + off + comp + blur + clip + color;
    };

    const insets = NAV_INSETS.map(inset).join("");

    const outer =
      `<feOffset in='goo' dx='${NAV_OUTER.dx}' dy='${NAV_OUTER.dy}' result='oo'/>` +
      `<feGaussianBlur in='oo' stdDeviation='${(NAV_OUTER.blur / 2).toFixed(2)}' result='og'/>` +
      `<feComposite in='og' in2='goo' operator='out' result='oc'/>` +
      `<feFlood flood-color='#000' flood-opacity='${NAV_OUTER.a.toFixed(3)}' result='of'/>` +
      `<feComposite in='of' in2='oc' operator='in' result='outer'/>`;

    // feMerge: último nó fica por cima. No CSS a PRIMEIRA sombra é a de
    // cima → mescla na ordem inversa da lista.
    const mergeNodes =
      `<feMergeNode in='outer'/><feMergeNode in='fill'/>` +
      NAV_INSETS.map((_, i) => `<feMergeNode in='s${NAV_INSETS.length - 1 - i}'/>`).join("");

    // Tudo em sRGB pra os alfas baterem com o CSS.
    const filter =
      `<filter id='m' x='-20%' y='-200%' width='140%' height='500%' color-interpolation-filters='sRGB'>` +
      `<feGaussianBlur in='SourceGraphic' stdDeviation='${t.GOO_BLUR}' result='blur'/>` +
      `<feColorMatrix in='blur' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${t.GOO_K} -${t.GOO_O}' result='goo'/>` +
      `<feFlood flood-color='#fff' flood-opacity='${NAV_FILL_A}' result='ff'/>` +
      `<feComposite in='ff' in2='goo' operator='in' result='fill'/>` +
      // Chapa opaca cobrindo a região do filtro: base pro complemento de
      // cada buraco (ver inset()).
      `<feFlood flood-color='#fff' flood-opacity='1' result='full'/>` +
      // Máscara "dura" da silhueta: o blur+limiar do spread precisa partir
      // de uma borda nítida, senão a rampa suave do goo soma com a do
      // limiar e o deslocamento sai maior que o pedido.
      `<feColorMatrix in='goo' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 8 -3.5' result='hard'/>` +
      outer +
      insets +
      `<feMerge>${mergeNodes}</feMerge>` +
      `</filter>`;

    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${windowW}' height='${slot}' viewBox='0 0 ${windowW} ${slot}'>` +
      `<defs>${filter}</defs>` +
      `<g filter='url(#m)' fill='#fff'>${shapes.join("")}</g></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }, [geom, windowW, slot, tuning]);

  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-10"
      style={{
        width: windowW,
        height: slot,
        backgroundImage: image,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
