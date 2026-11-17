import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from "framer-motion";
import { CONTENT_MIN_SCALE, TEMPOS, ilhaGeometria, ilhaLayout } from "./ilhaGeometria";

/**
 * Aviso dentro do app no formato da Ilha Dinâmica do iPhone.
 *
 * É só visual e só existe com o app ABERTO: a Ilha Dinâmica de verdade
 * (Live Activities) é exclusiva de app nativo e não existe para site nem
 * para app instalado pela tela de início. O que dá pra fazer na web é
 * desenhar em volta dela, e é isso: com `viewport-fit=cover` e a barra de
 * status translúcida (index.html), a página passa por trás da ilha.
 *
 * O site NÃO enxerga onde a ilha está. A posição sai das medidas do aparelho
 * (ilhaGeometria.ts): com a área segura do topo em ~59px (iPhone 14 Pro, 15,
 * 16...), a ilha tem 126×37 e fica a ~11px do topo. Só vale no app instalado;
 * numa aba do navegador o topo da tela é dele. Sem ilha, o aviso desce da
 * borda de cima.
 *
 * Três animações (`estilo`):
 *   • "expandir" — a própria ilha cresce e vira o cartão, como o iOS faz;
 *   • "compacta" — a ilha só alarga, com o ícone de um lado e o número do
 *                  outro (sem ilha, cai no "expandir");
 *   • "gota"     — uma gota escorre da ilha e se abre num cartão. É a do
 *                  rit3zh/expo-dynamic-notifications; ilha, pescoço e gota
 *                  são três <div> pretas fundidas por um filtro SVG (desfoque
 *                  + limiar de alfa), o mesmo truque da pílula do menu.
 */

export type EstiloIlha = "expandir" | "compacta" | "gota";

export interface AvisoIlha {
  id: string;
  titulo: string;
  mensagem?: string;
  /** Ícone (dentro do círculo roxo). */
  icone?: ReactNode;
  /** Número ou texto curto à direita. */
  selo?: string | number;
  /** Estilo "compacta": texto à esquerda da ilha. Padrão: o título. */
  curto?: string;
  /** Estilo "compacta": texto à direita da ilha. Padrão: o selo. */
  direita?: string;
  aoTocar?: () => void;
  /** ms aberto; `null` fica até ser tocado ou arrastado. Padrão: 3600. */
  duracao?: number | null;
}

export interface IlhaHandle {
  avisar: (aviso: AvisoIlha) => void;
  fechar: () => void;
}

interface IlhaProps {
  estilo?: EstiloIlha;
  /** Força a existência da ilha (laboratório /dev/ilha). Padrão: detecta. */
  temIlha?: boolean;
  /** Força a área segura do topo, em px (laboratório). Padrão: mede. */
  insetTopo?: number;
  /** Desenha a ilha mesmo parada (laboratório: no iPhone ela é o aparelho). */
  ilhaVisivel?: boolean;
}

const FILTRO_ID = "ilha-goo";
/** Desfoque do filtro gooey (px) e o quanto a ilha encolhe por baixo dele. */
const GOO_BLUR = 8;
const GOO_INSET = GOO_BLUR * 0.26;

/** "expandir": faixa de conteúdo abaixo da ilha e raio do cartão aberto. */
const EXPANDIR_CONTEUDO = 66;
const EXPANDIR_RAIO = 40;
/** "compacta": quanto a ilha cresce pra cada lado. */
const COMPACTA_ABA = 112;

type Mola = { duration: number; bounce: number; delay?: number };
const mola = (t: Mola) => ({ type: "spring" as const, ...t });
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const mix = (t: number, a: number, b: number) => a + (b - a) * t;

/** Área segura do topo, em px: o navegador só entrega isso via CSS. */
function medirInsetTopo() {
  const sonda = document.createElement("div");
  sonda.style.cssText = "position:fixed;top:0;left:0;height:env(safe-area-inset-top);width:0;visibility:hidden;pointer-events:none";
  document.body.appendChild(sonda);
  const h = sonda.getBoundingClientRect().height;
  sonda.remove();
  return h;
}

const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const IlhaDinamica = forwardRef<IlhaHandle, IlhaProps>(function IlhaDinamica(
  { estilo = "expandir", temIlha, insetTopo, ilhaVisivel = false },
  ref,
) {
  const [largura, setLargura] = useState(() => window.innerWidth);
  const [inset, setInset] = useState(() => insetTopo ?? 0);
  const [aviso, setAviso] = useState<AvisoIlha | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      setLargura(window.innerWidth);
      setInset(insetTopo ?? medirInsetTopo());
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [insetTopo]);

  // Ilha de verdade: app instalado num iPhone com a área segura alta. O notch
  // dos iPhones antigos dá ~47px; a ilha, 59 ou mais.
  const comIlha = temIlha ?? (instalado() && inset >= 51);
  const layout = useMemo(() => ilhaLayout(largura, inset, comIlha), [largura, inset, comIlha]);
  // Sem ilha não há o que ladear: a compacta vira a expandida.
  const modo: EstiloIlha = estilo === "compacta" && !comIlha ? "expandir" : estilo;

  const ilhaX = layout.centerX - layout.islandWidth / 2;

  // Onde a forma preta termina e onde o conteúdo mora, por estilo.
  const alvo = useMemo(() => {
    if (modo === "compacta") {
      const w = Math.min(layout.width - 32, layout.islandWidth + COMPACTA_ABA * 2);
      const caixa = { left: layout.centerX - w / 2, top: layout.islandTop, width: w, height: layout.islandHeight };
      return { forma: { ...caixa, radius: layout.islandRadius }, caixa };
    }
    if (modo === "expandir") {
      // Com ilha, o cartão começa no topo dela e o conteúdo fica na faixa de
      // baixo (em cima está a câmera). Sem ilha é um cartão comum.
      const top = comIlha ? layout.islandTop : layout.cardTop;
      const height = comIlha ? layout.islandHeight + EXPANDIR_CONTEUDO + 6 : layout.cardHeight;
      return {
        forma: { left: layout.cardLeft, top, width: layout.cardWidth, height, radius: Math.min(EXPANDIR_RAIO, height / 2) },
        caixa: {
          left: layout.cardLeft,
          top: comIlha ? layout.islandTop + layout.islandHeight : top,
          width: layout.cardWidth,
          height: comIlha ? EXPANDIR_CONTEUDO : layout.cardHeight,
        },
      };
    }
    const caixa = { left: layout.cardLeft, top: layout.cardTop, width: layout.cardWidth, height: layout.cardHeight };
    return { forma: { ...caixa, radius: layout.cardRadius }, caixa };
  }, [modo, layout, comIlha]);

  const drop = useMotionValue(0);
  const expand = useMotionValue(0);
  const reveal = useMotionValue(0);
  const arrasto = useMotionValue(0);

  const gotaRef = useRef<HTMLDivElement>(null);
  const pescocoRef = useRef<HTMLDivElement>(null);
  const sombraRef = useRef<HTMLDivElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);

  // Escreve a geometria direto no estilo dos elementos: são ~60 quadros por
  // segundo, e passar isso por estado do React re-renderizaria tudo a cada um.
  const pintar = useCallback(() => {
    const p = clamp01(reveal.get());
    const e = expand.get();
    let forma: { x: number; y: number; w: number; h: number; r: number };
    let pescoco = { x: 0, y: 0, w: 0, h: 0 };
    let sombra = 0;
    let conteudo: { y: number; escala: number; desfoque: number };

    if (modo === "gota") {
      const g = ilhaGeometria(drop.get(), e, layout);
      forma = { x: g.x, y: g.y, w: g.width, h: g.height, r: g.radius };
      pescoco = { x: g.neckX, y: g.neckY, w: g.neckWidth, h: g.neckHeight };
      sombra = clamp01(e);
      const quique = Math.min(Math.max(g.widthRatio - 1, 0), 0.2);
      conteudo = { y: g.offsetY, escala: CONTENT_MIN_SCALE + (1 - CONTENT_MIN_SCALE) * p + quique * p, desfoque: 0 };
    } else {
      // A ilha vira a forma final: mesma conta para "expandir" e "compacta".
      const f = alvo.forma;
      const w = Math.min(mix(e, layout.islandWidth, f.width), layout.width - 16);
      const h = Math.max(mix(e, layout.islandHeight, f.height), 0);
      forma = {
        x: layout.centerX - w / 2,
        y: mix(e, layout.islandTop, f.top),
        w,
        h,
        r: Math.min(mix(e, layout.islandRadius, f.radius), Math.min(w, h) / 2),
      };
      sombra = modo === "expandir" ? clamp01(e) : 0;
      conteudo = {
        y: modo === "expandir" ? (1 - clamp01(e)) * -10 : 0,
        escala: 0.94 + 0.06 * p,
        desfoque: (1 - p) * 6,
      };
    }

    const gota = gotaRef.current;
    if (gota) {
      gota.style.transform = `translate3d(${forma.x}px, ${forma.y}px, 0)`;
      gota.style.width = `${forma.w}px`;
      gota.style.height = `${forma.h}px`;
      gota.style.borderRadius = `${forma.r}px`;
    }
    const elPescoco = pescocoRef.current;
    if (elPescoco) {
      elPescoco.style.transform = `translate3d(${pescoco.x}px, ${pescoco.y}px, 0)`;
      elPescoco.style.width = `${pescoco.w}px`;
      elPescoco.style.height = `${pescoco.h}px`;
      elPescoco.style.borderRadius = `${pescoco.w / 2}px`;
    }
    const elSombra = sombraRef.current;
    if (elSombra) {
      elSombra.style.transform = `translate3d(${forma.x}px, ${forma.y}px, 0)`;
      elSombra.style.width = `${forma.w}px`;
      elSombra.style.height = `${forma.h}px`;
      elSombra.style.borderRadius = `${forma.r}px`;
      elSombra.style.opacity = String(sombra);
    }
    const elConteudo = conteudoRef.current;
    if (elConteudo) {
      elConteudo.style.opacity = String(p);
      elConteudo.style.transform = `translate3d(0, ${conteudo.y + arrasto.get()}px, 0) scale(${conteudo.escala})`;
      elConteudo.style.filter = conteudo.desfoque > 0.05 ? `blur(${conteudo.desfoque}px)` : "none";
      elConteudo.style.pointerEvents = p > 0.6 ? "auto" : "none";
    }
  }, [drop, expand, reveal, arrasto, layout, modo, alvo]);

  useMotionValueEvent(drop, "change", pintar);
  useMotionValueEvent(expand, "change", pintar);
  useMotionValueEvent(reveal, "change", pintar);
  useMotionValueEvent(arrasto, "change", pintar);
  useLayoutEffect(pintar, [pintar, aviso]);

  const animacoes = useRef<AnimationPlaybackControls[]>([]);
  const relogio = useRef<number | null>(null);
  const atual = useRef<AvisoIlha | null>(null);
  const naFila = useRef<AvisoIlha | null>(null);
  const saindo = useRef(false);
  const modoRef = useRef(modo);
  modoRef.current = modo;

  const parar = () => {
    animacoes.current.forEach((a) => a.stop());
    animacoes.current = [];
    if (relogio.current) window.clearTimeout(relogio.current);
    relogio.current = null;
  };

  const sair = useCallback(() => {
    if (!atual.current || saindo.current) return;
    saindo.current = true;
    parar();
    const aoTerminar = () => {
      const proximo = naFila.current;
      atual.current = null;
      naFila.current = null;
      saindo.current = false;
      arrasto.set(0);
      if (proximo) entrarRef.current(proximo);
      else setAviso(null);
    };
    if (modoRef.current === "gota") {
      animacoes.current = [
        animate(reveal, 0, mola(TEMPOS.fade)),
        animate(expand, 0, mola(TEMPOS.collapse)),
        animate(drop, 0, { ...mola(TEMPOS.volta), onComplete: aoTerminar }),
      ];
    } else {
      // O texto some primeiro; a ilha volta ao tamanho dela em seguida.
      animacoes.current = [
        animate(reveal, 0, { duration: 0.16, ease: "easeOut" }),
        animate(expand, 0, { ...mola({ duration: 0.5, bounce: 0.12, delay: 0.08 }), onComplete: aoTerminar }),
      ];
    }
  }, [drop, expand, reveal, arrasto]);

  const entrar = useCallback(
    (proximo: AvisoIlha) => {
      parar();
      atual.current = proximo;
      saindo.current = false;
      setAviso(proximo);
      drop.set(0);
      expand.set(0);
      reveal.set(0);
      arrasto.set(0);
      let ateAparecer: number;
      if (modoRef.current === "gota") {
        animacoes.current = [
          animate(drop, 1, mola(TEMPOS.drop)),
          animate(expand, 1, mola(TEMPOS.expand)),
          animate(reveal, 1, mola(TEMPOS.reveal)),
        ];
        ateAparecer = TEMPOS.reveal.delay * 1000;
      } else {
        // A ilha cresce com um leve quique e o texto entra logo depois.
        animacoes.current = [
          animate(expand, 1, mola({ duration: 0.6, bounce: 0.26 })),
          animate(reveal, 1, { duration: 0.32, ease: "easeOut", delay: 0.2 }),
        ];
        ateAparecer = 200;
      }
      const vida = proximo.duracao === undefined ? TEMPOS.permanencia : proximo.duracao;
      if (vida !== null) relogio.current = window.setTimeout(() => sair(), ateAparecer + vida);
    },
    [drop, expand, reveal, arrasto, sair],
  );
  const entrarRef = useRef(entrar);
  entrarRef.current = entrar;

  useImperativeHandle(
    ref,
    () => ({
      avisar: (proximo) => {
        if (atual.current) {
          naFila.current = proximo;
          sair();
        } else {
          entrar(proximo);
        }
      },
      fechar: () => {
        naFila.current = null;
        sair();
      },
    }),
    [entrar, sair],
  );

  useEffect(() => parar, []);

  // Arrastar pra cima recolhe; toque simples aciona `aoTocar`.
  const toque = useRef<{ y: number; t: number } | null>(null);
  const aoDescer = (e: React.PointerEvent) => {
    toque.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const aoMover = (e: React.PointerEvent) => {
    if (!toque.current) return;
    const dy = e.clientY - toque.current.y;
    // Pra cima acompanha o dedo; pra baixo resiste.
    arrasto.set(dy < 0 ? dy : dy * 0.25);
  };
  const aoSoltar = (e: React.PointerEvent) => {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio) return;
    const dy = e.clientY - inicio.y;
    const velocidade = (dy / Math.max(performance.now() - inicio.t, 1)) * 1000;
    if (dy < -18 || velocidade < -420) {
      naFila.current = null;
      sair();
      return;
    }
    animate(arrasto, 0, { type: "spring", duration: 0.56, bounce: 0.3 });
    if (Math.abs(dy) < 6) {
      atual.current?.aoTocar?.();
      naFila.current = null;
      sair();
    }
  };

  const montado = aviso !== null;
  if (!montado && !ilhaVisivel) return null;

  const forma: React.CSSProperties = { position: "absolute", left: 0, top: 0, background: "#000", willChange: "transform, width, height" };
  const toques = {
    onPointerDown: aoDescer,
    onPointerMove: aoMover,
    onPointerUp: aoSoltar,
    onPointerCancel: () => {
      toque.current = null;
      arrasto.set(0);
    },
  };
  const caixa: React.CSSProperties = {
    left: alvo.caixa.left,
    top: alvo.caixa.top,
    width: alvo.caixa.width,
    height: alvo.caixa.height,
    opacity: 0,
    transformOrigin: "center",
    willChange: "transform, opacity",
  };

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[300]"
      style={{ height: layout.canvasHeight }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id={FILTRO_ID} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={GOO_BLUR} result="desfoque" />
            {/* alfa × 22 − 9,46: tudo acima de 43% de alfa vira sólido. */}
            <feColorMatrix in="desfoque" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9.46" />
          </filter>
        </defs>
      </svg>

      {montado && (
        <>
          {/* Sombra do cartão, fora do filtro (o limiar a apagaria). */}
          <div ref={sombraRef} style={{ position: "absolute", left: 0, top: 0, boxShadow: "0 10px 28px rgba(0,0,0,0.55)", opacity: 0 }} />

          {/* Formas pretas. Na "gota" o filtro funde ilha, pescoço e gota;
              nos outros estilos é uma forma só, de borda nítida. */}
          <div className="absolute inset-0" style={modo === "gota" ? { filter: `url(#${FILTRO_ID})` } : undefined}>
            {modo === "gota" && (
              <div
                style={{
                  ...forma,
                  transform: `translate3d(${ilhaX + GOO_INSET}px, ${layout.islandTop + GOO_INSET}px, 0)`,
                  width: layout.islandWidth - GOO_INSET * 2,
                  height: layout.islandHeight - GOO_INSET * 2,
                  borderRadius: Math.max(layout.islandRadius - GOO_INSET, 0),
                }}
              />
            )}
            <div ref={pescocoRef} style={forma} />
            <div ref={gotaRef} style={forma} />
          </div>
        </>
      )}

      {/* A ilha em si, nítida, por cima. No iPhone ela coincide com o recorte
          do aparelho. */}
      <div
        style={{
          position: "absolute",
          left: ilhaX,
          top: layout.islandTop,
          width: layout.islandWidth,
          height: layout.islandHeight,
          borderRadius: layout.islandRadius,
          background: "#000",
        }}
      />

      {montado && modo === "compacta" && (
        // Ícone e texto de um lado da ilha, número do outro; o meio é a câmera.
        <div
          ref={conteudoRef}
          role="status"
          {...toques}
          className="absolute flex cursor-pointer touch-none select-none items-center justify-between pl-2 pr-3.5 text-white"
          style={caixa}
        >
          <span className="flex min-w-0 items-center gap-1.5" style={{ maxWidth: COMPACTA_ABA - 10 }}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6829c0] [&>svg]:h-4 [&>svg]:w-4">
              {aviso.icone}
            </span>
            <span className="truncate text-[12px] font-bold leading-none">{aviso.curto ?? aviso.titulo}</span>
          </span>
          <span className="truncate text-right text-[12px] font-bold leading-none tabular-nums text-[#c4b5fd]" style={{ maxWidth: COMPACTA_ABA - 18 }}>
            {aviso.direita ?? aviso.selo}
          </span>
        </div>
      )}

      {montado && modo !== "compacta" && (
        <div
          ref={conteudoRef}
          role="status"
          {...toques}
          className="absolute flex cursor-pointer touch-none select-none items-center gap-3 pl-3.5 pr-5 text-white"
          style={caixa}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6829c0] text-white shadow-[0_0_14px_rgba(104,41,192,0.55)]">
            {aviso.icone}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold leading-tight">{aviso.titulo}</span>
            {aviso.mensagem && (
              <span className="mt-0.5 block truncate text-[12px] leading-tight text-white/55">{aviso.mensagem}</span>
            )}
          </span>
          {aviso.selo !== undefined && (
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#6829c0] px-2 text-[11px] font-black tabular-nums text-white">
              {aviso.selo}
            </span>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
});
