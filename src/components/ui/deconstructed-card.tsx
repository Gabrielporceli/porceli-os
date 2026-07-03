import * as React from "react";
import { cn } from "@/lib/utils";

export interface DeconstructedCardProps {
  /** Conteúdo do chip (ícone + label), no canto superior-esquerdo. */
  chip: React.ReactNode;
  /** Conteúdo do corpo do card. */
  children: React.ReactNode;
  className?: string;
  /** Raio dos cantos externos (px). */
  radius?: number;
  /** Raio da curva côncava de transição chip→corpo (px). */
  fillet?: number;
}

/*
  Réplica GEOMÉTRICA do bevel do .liquid-glass (os 7 box-shadow insets).

  Um `inset dx dy blur spread cor` não é um traço: é a área entre a forma e
  uma CÓPIA dela deslocada por (dx, dy) — larga nas curvas (onde a cópia
  deslocada mais se afasta da borda) e afinando gradualmente ao longo das
  retas até sumir. É daí que vem o efeito de profundidade dos cards normais;
  um stroke uniforme (ou glow) nunca reproduz isso.

  Aqui cada inset vira: forma pintada na cor, mascarada pela própria forma
  transladada por (dx, dy) — mesma matemática do box-shadow, mas seguindo o
  contorno recortado (curva côncava incluída). O spread negativo é emulado
  engordando a cópia deslocada com stroke preto de largura 2*|spread|; o
  blur vira feGaussianBlur (stdDeviation ≈ blur/2) aplicado À FAIXA já
  mascarada.
*/
const BEVEL_INSETS = [
  { dx: 1.8, dy: 3, blur: 2, spread: -2, color: "rgba(255,255,255,0.8)" },
  { dx: -2, dy: -2, blur: 2, spread: -2, color: "rgba(255,255,255,0.65)" },
  { dx: -3, dy: -8, blur: 2, spread: -6, color: "rgba(255,255,255,0.5)" },
  { dx: -0.3, dy: -1, blur: 4, spread: 0, color: "rgba(0,0,0,0.12)" },
  { dx: -1.5, dy: 2.5, blur: 3, spread: -2, color: "rgba(0,0,0,0.16)" },
  { dx: 0, dy: 3, blur: 4, spread: -2, color: "rgba(0,0,0,0.16)" },
  { dx: 2, dy: -6.5, blur: 2, spread: -4, color: "rgba(0,0,0,0.10)" },
];

/**
 * Card "desconstruído": chip no canto superior-esquerdo conectado ao corpo
 * por uma curva côncava, com a área à direita do chip transparente.
 *
 * Implementado como UMA ÚNICA caixa recortada via clip-path: path() — é
 * isso que garante que o vidro leia como um único objeto físico, sem
 * costura na fronteira chip/corpo.
 *
 * O bevel NÃO usa box-shadow (só entende a caixa retangular, nunca o
 * clip-path) nem strokes/glow (brilho constante não é como o efeito real
 * funciona): é a réplica geométrica descrita em BEVEL_INSETS, via SVG.
 */
export function DeconstructedCard({
  chip,
  children,
  className,
  radius = 20,
  fillet = 18,
}: DeconstructedCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chipRef = React.useRef<HTMLDivElement>(null);
  const [shape, setShape] = React.useState<{ d: string; w: number; h: number } | null>(null);
  const uid = React.useId();

  React.useEffect(() => {
    const container = containerRef.current;
    const chipEl = chipRef.current;
    if (!container || !chipEl) return;

    const compute = () => {
      const W = container.offsetWidth;
      const H = container.offsetHeight;
      const Cw = chipEl.offsetWidth;
      const Ch = chipEl.offsetHeight;
      if (!W || !H || !Cw || !Ch) return;

      const r = Math.min(radius, Cw / 2, (W - Cw) / 2, Ch / 2, (H - Ch) / 2);
      const f = Math.max(0, Math.min(fillet, Ch - r, H - Ch - r, W - Cw - r));

      const d = [
        `M ${r} 0`,
        `H ${Cw - r}`,
        `A ${r} ${r} 0 0 1 ${Cw} ${r}`,
        `V ${Ch - f}`,
        `A ${f} ${f} 0 0 0 ${Cw + f} ${Ch}`,
        `H ${W - r}`,
        `A ${r} ${r} 0 0 1 ${W} ${Ch + r}`,
        `V ${H - r}`,
        `A ${r} ${r} 0 0 1 ${W - r} ${H}`,
        `H ${r}`,
        `A ${r} ${r} 0 0 1 0 ${H - r}`,
        `V ${r}`,
        `A ${r} ${r} 0 0 1 ${r} 0`,
        "Z",
      ].join(" ");

      setShape({ d, w: W, h: H });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    ro.observe(chipEl);
    return () => ro.disconnect();
  }, [radius, fillet]);

  return (
    <div
      ref={containerRef}
      className={cn("dc-single", className)}
      style={{ clipPath: shape ? `path('${shape.d}')` : undefined }}
    >
      <div ref={chipRef} className="dc-chip-row">
        {chip}
      </div>
      <div className="dc-body-content">{children}</div>

      {shape && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={shape.w}
          height={shape.h}
          viewBox={`0 0 ${shape.w} ${shape.h}`}
          aria-hidden="true"
        >
          <defs>
            {BEVEL_INSETS.map((ins, i) => (
              <React.Fragment key={i}>
                <filter
                  id={`${uid}-f${i}`}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation={ins.blur / 2} />
                </filter>
                <mask
                  id={`${uid}-m${i}`}
                  maskUnits="userSpaceOnUse"
                  x={-20}
                  y={-20}
                  width={shape.w + 40}
                  height={shape.h + 40}
                >
                  {/* revela o plano inteiro… */}
                  <rect
                    x={-20}
                    y={-20}
                    width={shape.w + 40}
                    height={shape.h + 40}
                    fill="#fff"
                  />
                  {/* …menos a cópia deslocada (engordada p/ emular o spread
                      negativo) — a "fonte de sombra" do inset */}
                  <path
                    d={shape.d}
                    fill="#000"
                    stroke="#000"
                    strokeWidth={Math.abs(ins.spread) * 2}
                    transform={`translate(${ins.dx} ${ins.dy})`}
                  />
                </mask>
              </React.Fragment>
            ))}
          </defs>

          {/*
            Ordem das operações = a do box-shadow real: a fonte de sombra
            (plano menos a cópia deslocada) é DESFOCADA primeiro, e o corte
            nítido no contorno vem depois (feito pelo clip-path do container).
            Resultado: rim NÍTIDO exatamente na borda, dissolvendo suave pra
            dentro — igual aos cards normais. (Mascarar a faixa primeiro e
            desfocar depois suavizava a beirada externa também → borda lavada.)
          */}
          {BEVEL_INSETS.map((ins, i) => (
            <g key={i} filter={`url(#${uid}-f${i})`}>
              <g mask={`url(#${uid}-m${i})`}>
                <rect
                  x={-20}
                  y={-20}
                  width={shape.w + 40}
                  height={shape.h + 40}
                  fill={ins.color}
                />
              </g>
            </g>
          ))}

          {/* hairline constante, igual ao border: 1px white/0.06 dos cards.
              strokeWidth 2 porque o stroke é centrado no path: a metade
              externa é clipada pelo clip-path do container, sobrando 1px
              visível pra dentro — mesma largura do border real. */}
          <path
            d={shape.d}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={2}
          />
        </svg>
      )}
    </div>
  );
}
