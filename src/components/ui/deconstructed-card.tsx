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

/**
 * Card "desconstruído": chip no canto superior-esquerdo conectado ao corpo
 * por uma curva côncava, com a área à direita do chip transparente.
 *
 * Implementado como UMA ÚNICA caixa recortada via clip-path: path() (não 3
 * peças separadas) — é isso que garante que o bevel/vidro leia como um
 * único objeto físico, sem costura na fronteira chip/corpo.
 *
 * O CONTORNO não usa box-shadow nem drop-shadow: box-shadow só entende a
 * caixa retangular do elemento (nunca o clip-path — no trecho do corpo logo
 * após a curva, que não é uma aresta real da caixa, ele nunca desenharia
 * nada), e drop-shadow + clip-path côncavo tem um bug de renderização do
 * Chromium que deixa falhas bem na inflexão da curva. A solução é um
 * <svg><path> real, com o MESMO `d` do clip-path, desenhado com stroke —
 * garante que o contorno acompanhe exatamente o recorte, sem depender de
 * heurística nenhuma do navegador.
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

      {/* Contorno real: stroke SVG sobre o MESMO path do clip-path. */}
      {shape && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={shape.w}
          height={shape.h}
          viewBox={`0 0 ${shape.w} ${shape.h}`}
          aria-hidden="true"
        >
          <path
            d={shape.d}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1}
          />
        </svg>
      )}
    </div>
  );
}
