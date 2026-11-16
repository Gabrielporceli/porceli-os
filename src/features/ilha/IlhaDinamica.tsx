import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from "framer-motion";
import { CONTENT_MIN_SCALE, TEMPOS, ilhaGeometria, ilhaLayout } from "./ilhaGeometria";

/**
 * Aviso dentro do app no formato da Ilha Dinâmica do iPhone: uma gota preta
 * escorre da ilha, desce e se abre num cartão; depois recolhe de volta.
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
 * numa aba do Safari o topo da tela é do navegador. Sem ilha, a gota desce
 * da borda de cima.
 *
 * O "líquido": ilha, pescoço e gota são três <div> pretas dentro de um
 * contêiner com filtro SVG (desfoque + limiar de alfa), que funde as três
 * numa forma só. Mesmo truque da pílula do menu (MobilePillBlob).
 */

export interface AvisoIlha {
  id: string;
  titulo: string;
  mensagem?: string;
  /** Ícone à esquerda (dentro do círculo roxo). */
  icone?: ReactNode;
  /** Número ou texto curto à direita. */
  selo?: string | number;
  aoTocar?: () => void;
  /** ms aberto; `null` fica até ser tocado ou arrastado. Padrão: 3600. */
  duracao?: number | null;
}

export interface IlhaHandle {
  avisar: (aviso: AvisoIlha) => void;
  fechar: () => void;
}

interface IlhaProps {
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
  { temIlha, insetTopo, ilhaVisivel = false },
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
    const g = ilhaGeometria(drop.get(), expand.get(), layout);
    const gota = gotaRef.current;
    if (gota) {
      gota.style.transform = `translate3d(${g.x}px, ${g.y}px, 0)`;
      gota.style.width = `${g.width}px`;
      gota.style.height = `${g.height}px`;
      gota.style.borderRadius = `${g.radius}px`;
    }
    const pescoco = pescocoRef.current;
    if (pescoco) {
      pescoco.style.transform = `translate3d(${g.neckX}px, ${g.neckY}px, 0)`;
      pescoco.style.width = `${g.neckWidth}px`;
      pescoco.style.height = `${g.neckHeight}px`;
      pescoco.style.borderRadius = `${g.neckWidth / 2}px`;
    }
    const sombra = sombraRef.current;
    if (sombra) {
      sombra.style.transform = `translate3d(${g.x}px, ${g.y}px, 0)`;
      sombra.style.width = `${g.width}px`;
      sombra.style.height = `${g.height}px`;
      sombra.style.borderRadius = `${g.radius}px`;
      sombra.style.opacity = String(Math.min(Math.max(expand.get(), 0), 1));
    }
    const conteudo = conteudoRef.current;
    if (conteudo) {
      const p = Math.min(Math.max(reveal.get(), 0), 1);
      const quique = Math.min(Math.max(g.widthRatio - 1, 0), 0.2);
      const escala = CONTENT_MIN_SCALE + (1 - CONTENT_MIN_SCALE) * p + quique * p;
      conteudo.style.opacity = String(p);
      conteudo.style.transform = `translate3d(0, ${g.offsetY + arrasto.get()}px, 0) scale(${escala})`;
      conteudo.style.pointerEvents = p > 0.6 ? "auto" : "none";
    }
  }, [drop, expand, reveal, arrasto, layout]);

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
    const mola = (t: { duration: number; bounce: number; delay?: number }) => ({ type: "spring" as const, ...t });
    animacoes.current = [
      animate(reveal, 0, mola(TEMPOS.fade)),
      animate(expand, 0, mola(TEMPOS.collapse)),
      animate(drop, 0, {
        ...mola(TEMPOS.volta),
        onComplete: () => {
          const proximo = naFila.current;
          atual.current = null;
          naFila.current = null;
          saindo.current = false;
          arrasto.set(0);
          if (proximo) entrarRef.current(proximo);
          else setAviso(null);
        },
      }),
    ];
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
      const mola = (t: { duration: number; bounce: number; delay?: number }) => ({ type: "spring" as const, ...t });
      animacoes.current = [
        animate(drop, 1, mola(TEMPOS.drop)),
        animate(expand, 1, mola(TEMPOS.expand)),
        animate(reveal, 1, mola(TEMPOS.reveal)),
      ];
      const vida = proximo.duracao === undefined ? TEMPOS.permanencia : proximo.duracao;
      if (vida !== null) {
        relogio.current = window.setTimeout(() => sair(), TEMPOS.reveal.delay * 1000 + vida);
      }
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

  const ilhaX = layout.centerX - layout.islandWidth / 2;
  const montado = aviso !== null;
  if (!montado && !ilhaVisivel) return null;

  const forma: React.CSSProperties = { position: "absolute", left: 0, top: 0, background: "#000", willChange: "transform, width, height" };

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

          {/* Camada líquida: ilha (encolhida), pescoço e gota, fundidos. */}
          <div className="absolute inset-0" style={{ filter: `url(#${FILTRO_ID})` }}>
            <div
              style={{
                ...forma,
                transform: `translate3d(${ilhaX + GOO_INSET}px, ${layout.islandTop + GOO_INSET}px, 0)`,
                width: layout.islandWidth - GOO_INSET * 2,
                height: layout.islandHeight - GOO_INSET * 2,
                borderRadius: Math.max(layout.islandRadius - GOO_INSET, 0),
              }}
            />
            <div ref={pescocoRef} style={forma} />
            <div ref={gotaRef} style={forma} />
          </div>
        </>
      )}

      {/* A ilha em si, nítida, por cima da camada líquida. No iPhone ela
          coincide com o recorte do aparelho. */}
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

      {montado && (
        <div
          ref={conteudoRef}
          role="status"
          onPointerDown={aoDescer}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={() => { toque.current = null; arrasto.set(0); }}
          className="absolute flex cursor-pointer touch-none select-none items-center gap-3 pl-3.5 pr-5 text-white"
          style={{
            left: layout.cardLeft,
            top: layout.cardTop,
            width: layout.cardWidth,
            height: layout.cardHeight,
            opacity: 0,
            transformOrigin: "center",
            willChange: "transform, opacity",
          }}
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
