import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MobilePillBlob } from "@/components/Layout/MobilePillBlob";
import { PILL_DEFAULTS, idleWidePillGeom, transferWidePillGeom, type PillGeom } from "@/components/Layout/mobilePillGeometry";

/**
 * Abas em pílula — escolher UMA opção entre poucas (2–5): filtro, tipo, seção.
 *
 * A pílula que marca a aba ativa é a MESMA da barra lateral do sistema: vidro
 * líquido (gooey + bisel geométrico, ver MobilePillBlob) que se transfere de
 * uma aba para a outra — a bolha antiga drena, a nova cresce e, entre abas
 * vizinhas, um pescoço liga as duas. Mesma duração (620ms), mesmo easing e os
 * mesmos marcos do menu lateral (PILL_DEFAULTS).
 */
export interface PillTabItem {
  value: string;
  label: React.ReactNode;
  /** Contagem opcional, mostrada ao lado do rótulo. */
  count?: number;
}

interface PillTabsProps {
  items: PillTabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Rótulos maiores (abas de página). Padrão: 11px em caixa alta. */
  size?: "sm" | "md";
  /** Ocupa a largura toda e reparte as abas por igual. */
  fill?: boolean;
}

/** Duração da transferência (ms): a mesma da barra lateral. */
const DURATION_MS = 620;
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export function PillTabs({ items, value, onChange, className, size = "sm", fill }: PillTabsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const anchorRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pill, setPill] = useState<{ geom: PillGeom; w: number; slot: number } | null>(null);
  const { SWITCH_AT } = PILL_DEFAULTS;

  // Coordenadas relativas ao wrapper, medidas ao vivo (resize/fonte acompanham).
  const measure = (fromV: string | null, toV: string, p: number) => {
    const wrap = wrapRef.current;
    const toEl = tabRefs.current.get(toV);
    if (!wrap || !toEl) return null;
    const wr = wrap.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    const slot = tr.height;
    const nx = tr.left - wr.left;
    const fromEl = fromV && fromV !== toV ? tabRefs.current.get(fromV) : null;
    if (!fromEl || p >= SWITCH_AT) return { geom: idleWidePillGeom(nx, tr.width), w: wr.width, slot };
    const fr = fromEl.getBoundingClientRect();
    return { geom: transferWidePillGeom(fr.left - wr.left, fr.width, nx, tr.width, slot, p), w: wr.width, slot };
  };

  // Anima a transferência quando a aba ativa muda.
  useLayoutEffect(() => {
    const from = anchorRef.current;
    const to = value;
    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    stop();
    if (!tabRefs.current.get(to)) {
      anchorRef.current = null;
      setPill(null);
      return;
    }
    if (!from || from === to) {
      anchorRef.current = to;
      setPill(measure(to, to, 1));
    } else {
      const started = performance.now();
      const tick = (now: number) => {
        const u = Math.min(1, (now - started) / DURATION_MS);
        setPill(measure(from, to, ease(u) * SWITCH_AT));
        if (u < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          anchorRef.current = to;
          setPill(measure(to, to, 1));
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    const wrap = wrapRef.current;
    if (!wrap) return stop;
    // Parada, a pílula acompanha mudanças de tamanho (fonte carregando, janela).
    const ro = new ResizeObserver(() => {
      if (!rafRef.current && anchorRef.current) setPill(measure(anchorRef.current, anchorRef.current, 1));
    });
    ro.observe(wrap);
    return () => {
      stop();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items.length]);

  return (
    <div
      ref={wrapRef}
      role="tablist"
      className={cn("relative items-center gap-1 rounded-full bg-white/[0.04] p-1", fill ? "flex w-full" : "inline-flex flex-wrap", className)}
    >
      {pill && <MobilePillBlob geom={pill.geom} windowW={pill.w} slot={pill.slot} />}
      {items.map((item) => {
        const ativa = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              if (el) tabRefs.current.set(item.value, el);
              else tabRefs.current.delete(item.value);
            }}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative z-20 rounded-full font-bold uppercase tracking-[0.08em] transition-colors duration-500",
              fill && "flex-1",
              size === "md" ? "px-5 py-2 text-xs" : "px-4 py-1.5 text-[11px]",
              ativa ? "lqg-text text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && <span className="ml-1.5 opacity-60">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
