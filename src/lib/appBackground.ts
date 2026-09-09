import type { CSSProperties } from "react";

/**
 * Fundo do app: wallpaper + escurecimento + grão, TUDO num elemento só.
 *
 * ===== Por que não é mais uma camada separada com mix-blend-mode =====
 *
 * O grão era uma `div` própria, fixed sobre a tela inteira, com
 * `opacity-[0.05] mix-blend-overlay`. Isso causava um bug bem visível: passar
 * o mouse em qualquer componente interativo "acendia" uma tarja clara em
 * outros cards de vidro da página — inclusive em cards acima, longe do mouse.
 *
 * Causa: um elemento com `mix-blend-mode` diferente de `normal` torna o
 * contexto de empilhamento pai NÃO-ISOLADO. O Chrome passa a ter que compor o
 * grupo inteiro junto, e todo `backdrop-filter` dentro desse grupo re-amostra
 * o backdrop sempre que qualquer coisa no grupo repinta. Um hover num gráfico
 * lá embaixo obrigava os cards de vidro do topo a recalcular o backdrop, e os
 * tiles do compositor discordavam na borda. Como `overlay` amplifica
 * contraste, a discordância aparecia como faixa clara em vez de passar
 * despercebida.
 *
 * Isolado por eliminação no navegador do usuário (A/B com um toggle por vez):
 *
 *   remover a camada de grão ......................... tarja SOME
 *   manter a camada, tirar só o mix-blend-mode ....... tarja SOME   ← prova
 *   remover TODO backdrop-filter ..................... tarja SOME
 *   wallpaper sem position:fixed ..................... continua
 *   header sem will-change/translateZ ................ continua
 *   sem o filtro SVG de refração ..................... continua
 *
 * A linha 2 é a prova: a camada não é o problema, a MESCLAGEM é.
 *
 * Solução: `background-blend-mode` no lugar de `mix-blend-mode`. Ele mescla as
 * camadas de background DENTRO de um único elemento — é operação de pintura,
 * não cria backdrop root nem quebra o isolamento do grupo. Visualmente é o
 * mesmo resultado (o grão já era mesclado só contra wallpaper + escurecimento,
 * que agora são camadas do mesmo elemento), com custo de composição zero.
 *
 * NÃO volte a usar `mix-blend-mode` numa camada por cima da página — em
 * qualquer tela que tenha `backdrop-filter`, o bug volta.
 */

const NOISE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E";

/** Ordem das camadas: grão (mesclado) → escurecimento → imagem. */
function build(image: string, dim: number): CSSProperties {
  const veil = `rgba(0, 0, 0, ${dim})`;
  return {
    backgroundImage: `url("${NOISE}"), linear-gradient(${veil}, ${veil}), url("${image}")`,
    backgroundSize: "200px 200px, 100% 100%, cover",
    backgroundPosition: "0 0, 0 0, center",
    backgroundRepeat: "repeat, no-repeat, no-repeat",
    backgroundBlendMode: "overlay, normal, normal",
  };
}

/** Fundo das telas internas (CRMLayout). */
export const appBackgroundStyle = build("/app-bg.webp", 0.25);

/* ── Login ──
   Ali o escurecimento vinha num filho com `backdrop-blur-sm`, então o
   wallpaper aparecia levemente desfocado. Como o grão não pode mais ser uma
   camada mesclada por cima, o par virou: wallpaper com `filter: blur` (mesmo
   resultado visual, sem backdrop-filter) + escurecimento e grão mesclados
   entre si num elemento só. O `scale` evita borda desfocada na moldura. */
export const loginWallpaperStyle: CSSProperties = {
  backgroundImage: 'url("/background.png")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  filter: "blur(4px)",
  transform: "scale(1.05)",
};

/** Camada de grão isolada, para quem precisa remontar o fundo à mão
 *  (KanbanGlassBackdrop replica o wallpaper dentro do backdrop root da faixa). */
export const NOISE_LAYER_URL = NOISE;

export const loginOverlayStyle: CSSProperties = {
  backgroundImage: `url("${NOISE}"), linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4))`,
  backgroundSize: "200px 200px, 100% 100%",
  backgroundPosition: "0 0, 0 0",
  backgroundRepeat: "repeat, no-repeat",
  backgroundBlendMode: "overlay, normal",
};
