import * as React from "react";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_MAP } from "./liquid-glass-map";

/**
 * Apple Tahoe Liquid Glass Button
 * Adaptado de easemize / "apple-tahoe-liquid-glass-button" (21st.dev),
 * espelhado em wundercorp/awesome-components.
 *
 * Técnica: uma camada-lente vazia (-z-10) com backdrop-filter que combina
 * blur + saturate + um filtro SVG (feDisplacementMap) que refrata o fundo
 * usando um mapa de deslocamento WebP pré-renderizado. No Chrome/Edge a
 * refração aparece; no Safari cai de volta para blur/saturate.
 */

const FILTER_ID = "liquid-glass-refraction";

/** Renderize UMA vez por página. Define o filtro SVG compartilhado. */
export function LiquidGlassFilter() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <filter id={FILTER_ID} primitiveUnits="objectBoundingBox">
        <feImage
          result="map"
          width="100%"
          height="100%"
          x="0"
          y="0"
          href={LIQUID_GLASS_MAP}
          preserveAspectRatio="none"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
        <feDisplacementMap
          in="blur"
          in2="map"
          scale="0.5"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tom do vidro. "neutral" = vidro escuro; demais = vidro tingido na cor. */
  tint?: "neutral" | "primary" | "success" | "danger";
}

export const LiquidGlassButton = React.forwardRef<
  HTMLButtonElement,
  LiquidGlassButtonProps
>(({ className, children, tint = "neutral", ...props }, ref) => {
  // Nomes de classe literais (não dinâmicos) para o Tailwind não purgar as regras
  const tintClass =
    tint === "primary"
      ? "lqg-lens--primary"
      : tint === "success"
        ? "lqg-lens--success"
        : tint === "danger"
          ? "lqg-lens--danger"
          : "";
  return (
    <button
      ref={ref}
      className={cn(
        "lqg-btn relative isolate inline-flex items-center justify-center gap-2 rounded-full cursor-pointer transition-transform duration-300 ease-out tracking-tight disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    >
      {/* Camada-lente: deve ficar VAZIA para o backdrop-filter capturar só o fundo */}
      <span
        className={cn(
          "lqg-lens absolute inset-0 -z-10 rounded-[inherit] pointer-events-none",
          tintClass,
        )}
      />
      <span className="lqg-text relative z-10 w-full justify-center select-none flex items-center gap-2">
        {children}
      </span>
    </button>
  );
});
LiquidGlassButton.displayName = "LiquidGlassButton";
