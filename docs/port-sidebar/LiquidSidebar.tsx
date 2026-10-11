/**
 * Barra lateral de vidro líquido — versão AUTÔNOMA (só desktop) da barra do
 * Porceli OS, para levar a outros sistemas. Extraída de
 * src/components/Layout/Header.tsx sem mudar nenhum número.
 *
 * O que ela faz, igual ao original:
 *   • vidro SEM backdrop-filter (o wallpaper é repintado dentro da barra e
 *     alinhado por JS — ver useSideNavWallpaper e liquid-sidebar.css);
 *   • pílula "líquida" (gooey + bisel geométrico) que se transfere de um
 *     ícone para o outro, em 620ms, easeInOutCubic, só no eixo vertical;
 *   • item com disco `bg-white/5` no hover (300ms).
 *
 * Depende de: React 18, Tailwind, e dos arquivos irmãos
 * MobilePillBlob.tsx + mobilePillGeometry.ts + liquid-sidebar.css.
 * Não depende de roteador: quem manda é `activeUrl`; clique chama `onSelect`.
 */
import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { MobilePillBlob } from "./MobilePillBlob";
import { PILL_DEFAULTS, idlePillGeom, transferPillGeom, type PillGeom } from "./mobilePillGeometry";

export interface SidebarItem {
  /** Identificador único (a "rota"). */
  url: string;
  title: string;
  /** Ícone: componente que aceita `className` e usa currentColor. */
  icon: ComponentType<{ className?: string }>;
}

interface Props {
  items: SidebarItem[];
  activeUrl: string;
  onSelect: (url: string) => void;
  /** Topo (logo). Padrão do original: `<img class="h-8 w-8 object-contain">`. */
  logo?: ReactNode;
  /** Base (botão de sair). */
  footer?: ReactNode;
  /** MESMO wallpaper que está no fundo da página (cover + center). */
  wallpaper?: string;
  /** Duração da transferência da pílula (ms). Original: 620. */
  durationMs?: number;
  /** Avisado no começo de cada animação (ex.: segurar um overlay de carregamento). */
  onAnimate?: (ms: number) => void;
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Alinha o wallpaper pintado dentro da .side-nav com o fundo real da página
 * (fixed, cover, center). `background-attachment: fixed` não serve: o blur do
 * ::before é um `filter`, e o Chrome desliga o fixed em elemento filtrado.
 */
function useSideNavWallpaper(ref: RefObject<HTMLElement>, wallpaper: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const FOLGA = 40; // o mesmo `inset: -40px` do ::before
    let nat: { w: number; h: number } | null = null;
    const alinhar = () => {
      if (!nat) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const k = Math.max(vw / nat.w, vh / nat.h); // cover
      const dw = nat.w * k;
      const dh = nat.h * k;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sn-w", `${dw}px`);
      el.style.setProperty("--sn-h", `${dh}px`);
      el.style.setProperty("--sn-x", `${(vw - dw) / 2 - (r.left - FOLGA)}px`);
      el.style.setProperty("--sn-y", `${(vh - dh) / 2 - (r.top - FOLGA)}px`);
    };
    const img = new Image();
    img.onload = () => {
      nat = { w: img.naturalWidth, h: img.naturalHeight };
      alinhar();
    };
    img.src = wallpaper;
    window.addEventListener("resize", alinhar);
    return () => window.removeEventListener("resize", alinhar);
  }, [ref, wallpaper]);
}

export function LiquidSidebar({
  items,
  activeUrl,
  onSelect,
  logo,
  footer,
  wallpaper = "/app-bg.webp",
  durationMs = 620,
  onAnimate,
}: Props) {
  const sideNavRef = useRef<HTMLElement>(null);
  useSideNavWallpaper(sideNavRef, wallpaper);

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pill, setPill] = useState<{ geom: PillGeom; w: number; slot: number } | null>(null);
  const { SWITCH_AT } = PILL_DEFAULTS;

  // Geometria da pílula num instante p da transferência. Coordenadas relativas
  // ao WRAPPER (que não rola), medidas ao vivo a cada frame. A pílula anda no
  // eixo VERTICAL; o `slot` sai da MEDIÇÃO do item, nunca de uma constante.
  const measure = (fromUrl: string | null, toUrl: string, p: number) => {
    const wrap = wrapRef.current;
    const toEl = itemRefs.current.get(toUrl);
    if (!wrap || !toEl) return null;
    const wrapRect = wrap.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const slot = toRect.height;
    const nx = toRect.top - wrapRect.top;
    const fromEl = fromUrl && fromUrl !== toUrl ? itemRefs.current.get(fromUrl) : null;
    if (!fromEl || p >= SWITCH_AT) return { geom: idlePillGeom(nx, slot), w: wrapRect.height, slot };
    const ax = fromEl.getBoundingClientRect().top - wrapRect.top;
    return { geom: transferPillGeom(ax, nx, slot, p), w: wrapRect.height, slot };
  };

  // Anima a transferência quando a rota ativa muda. A rota nova só vira
  // âncora no fim — até lá a bolha antiga ainda está drenando.
  useLayoutEffect(() => {
    const from = anchorRef.current;
    const to = activeUrl;
    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    stop();
    if (!itemRefs.current.get(to)) {
      anchorRef.current = null;
      setPill(null); // rota sem item no menu: some a pílula
      return;
    }
    if (!from || from === to) {
      anchorRef.current = to;
      setPill(measure(to, to, 1));
    } else {
      onAnimate?.(durationMs);
      const started = performance.now();
      // easeInOutCubic: sai devagar, ganha corpo no meio, assenta suave.
      const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      const tick = (now: number) => {
        const u = Math.min(1, (now - started) / durationMs);
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
    // Mantém a pílula no lugar quando a barra muda de tamanho (fonte
    // carregando, breakpoints, scrollbar).
    const ro = new ResizeObserver(() => {
      if (!rafRef.current && anchorRef.current) setPill(measure(anchorRef.current, anchorRef.current, 1));
    });
    ro.observe(wrap);
    return () => {
      stop();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl]);

  return (
    <div className="fixed bottom-0 left-0 top-0 z-[60] flex items-stretch py-4 pl-4">
      <div className="side-nav-shadow flex">
        <header ref={sideNavRef} className="side-nav flex w-[72px] flex-col items-center gap-3 py-4">
          {/* Logo */}
          <div className="flex w-full shrink-0 items-center justify-center border-b border-white/5 pb-3">{logo}</div>

          {/* Wrapper EXTERNO (sem overflow) segurando a pílula — o <nav> tem
              overflow-y-auto e cortaria o blur do filtro gooey numa borda reta. */}
          <div ref={wrapRef} className="relative w-full flex-1">
            {pill && <MobilePillBlob geom={pill.geom} windowW={pill.w} slot={pill.slot} vertical />}
            <nav className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-y-auto scrollbar-hide">
              {items.map((item) => {
                const isActive = activeUrl === item.url;
                const Icon = item.icon;
                return (
                  <button
                    key={item.url}
                    type="button"
                    title={item.title}
                    onClick={() => onSelect(item.url)}
                    className="flex w-full shrink-0 items-center justify-center"
                  >
                    <div
                      ref={(el) => {
                        if (el) itemRefs.current.set(item.url, el);
                        else itemRefs.current.delete(item.url);
                      }}
                      className="group relative isolate z-10 flex h-10 w-10 shrink-0 transform-gpu items-center justify-center rounded-full will-change-transform md:h-11 md:w-11"
                    >
                      {!isActive && (
                        <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      )}
                      <Icon
                        className={cx(
                          "relative z-10 h-4 w-4 transition-colors sm:h-[18px] sm:w-[18px]",
                          isActive ? "lqg-text text-white" : "text-white/40 group-hover:text-white/70"
                        )}
                      />
                      <span className="sr-only">{item.title}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sair */}
          <div className="flex w-full shrink-0 items-center justify-center border-t border-white/5 pt-3">{footer}</div>
        </header>
      </div>
    </div>
  );
}
