import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate, motion, useMotionTemplate, useMotionValue } from "framer-motion";

/**
 * Transição de página: a tela inteira fica DESFOCADA com a logo do header
 * no meio, e o desfoque + a logo vão sumindo juntos conforme a página fica
 * pronta — a tela se materializa de embaçada pra nítida.
 *
 * Sequência:
 *   1. Overlay cobre a tela e o desfoque sobe de 0 até BLUR_MAX; logo entra
 *      caindo de cima (-130%) com um leve balanço no fim.
 *   2. Página pronta → desfoque volta a 0 e a logo some AO MESMO TEMPO,
 *      devagar (SETTLE). Como o conteúdo real já montou atrás do overlay
 *      nesse instante, é ele que aparece nitidando.
 *
 * Por que o desfoque é `backdrop-filter` e não `filter` no conteúdo: um
 * `filter` no container vira bloco de contenção e quebraria o
 * `position: fixed` do header (ele ficaria preso ao container em vez da
 * viewport). O backdrop-filter desfoca o que está ATRÁS sem tocar no
 * layout de ninguém.
 *
 * Arquitetura: as páginas continuam renderizando <PageLoader /> enquanto
 * `usePageReady()` é false (nada muda nelas). Só que o PageLoader não
 * desenha nada — ele apenas avisa este provider que está montado. O overlay
 * mora no layout (CRMLayout), por FORA da página: é isso que permite a
 * saída animada acontecer por cima do conteúdo já montado — se o overlay
 * fosse filho da página, sumiria junto no instante em que ela trocasse
 * pro conteúdo real, sem tempo de animar.
 */

// Easing da entrada da logo, herdado do Webflow: ease-out com overshoot
// (ela chega com um leve balanço).
const SWING_TO = [0.175, 0.885, 0.32, 1.275] as const;

/**
 * Easing da SAÍDA. Quase reto de propósito.
 *
 * Antes era o "outCirc" do Webflow ([0.075, 0.82, 0.165, 1]), que é
 * brutalmente adiantado. Medido:
 *
 *     tempo    outCirc    esta curva
 *      10%       60%          3%
 *      25%       84%         16%
 *      50%       96%         50%
 *      75%       99%         84%
 *
 * Ou seja: o desfoque sumia quase todo no primeiro décimo e o resto só se
 * arrastava — abrupto por mais que se aumentasse a duração. Esta curva é
 * simétrica e distribui o movimento por igual do começo ao fim.
 */
const SETTLE_EASE = [0.33, 0, 0.67, 1] as const;

/** Quanto a tela chega a desfocar, em px. */
const BLUR_MAX = 18;

// Tempos (ms). Estão aqui em cima de propósito: pra um CRM navegado
// dezenas de vezes por dia, pode valer encurtar.
const BLUR_IN = 380;
const LOGO_IN_DELAY = 200;
const LOGO_IN = 500;
/** Saída: desfoque e logo sumindo juntos, devagar. */
const SETTLE = 1600;
/** A entrada da logo precisa terminar antes de começar a saída — senão,
 *  quando os dados chegam rápido, ela some no meio do caminho. */
const MIN_HOLD = LOGO_IN_DELAY + LOGO_IN;

/**
 * Quanto tempo, no máximo, o conteúdo pode ficar segurado esperando o
 * overlay. VÁLVULA DE SEGURANÇA: se a coreografia travar por qualquer
 * motivo, a página aparece assim mesmo. O pior caso vira um defeito
 * estético (conteúdo entrando sem blur), nunca uma tela morta.
 */
const CONTENT_WATCHDOG = 4000;

interface PageTransitionContextValue {
  /** Chamado pelo gate de cada página: avisa que os dados NÃO estão prontos. */
  reportNotReady: () => () => void;
  /** Chamado pelo Header quando começa uma transferência da pílula. */
  signalHeaderAnim: (durationMs: number) => void;
  /** Instante (epoch ms) em que a animação do header termina. */
  headerAnimUntilRef: React.MutableRefObject<number>;
  /** true quando o desfoque já está cobrindo a tela. */
  covering: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  // Contador em vez de boolean: robusto caso duas páginas cheguem a
  // coexistir por um commit durante a troca de rota.
  const [notReadyCount, setNotReadyCount] = useState(0);
  const [covering, setCovering] = useState(false);

  const reportNotReady = useCallback(() => {
    setNotReadyCount((c) => c + 1);
    return () => setNotReadyCount((c) => Math.max(0, c - 1));
  }, []);

  // Ref, não estado: escrito durante um useLayoutEffect do Header e lido
  // logo depois pelo overlay. Virar estado só causaria um render a mais
  // sem mudar nada na tela.
  const headerAnimUntilRef = useRef(0);
  const signalHeaderAnim = useCallback((durationMs: number) => {
    headerAnimUntilRef.current = Date.now() + durationMs;
  }, []);

  const value = useMemo(
    () => ({ reportNotReady, signalHeaderAnim, headerAnimUntilRef, covering }),
    [reportNotReady, signalHeaderAnim, covering]
  );

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
      <PageTransitionOverlay
        loading={notReadyCount > 0}
        headerAnimUntilRef={headerAnimUntilRef}
        onCoveringChange={setCovering}
      />
    </PageTransitionContext.Provider>
  );
}

/**
 * Portão do conteúdo da página. Recebe "os dados chegaram?" e devolve
 * "pode desenhar?".
 *
 * O ponto todo: mesmo com os dados prontos, o conteúdo fica segurado até
 * o desfoque estar COBRINDO a tela. Assim ele monta escondido atrás do
 * blur e é revelado pela saída dele — nunca aparece nítido antes, que era
 * o problema (a página piscava pronta durante a animação do header e só
 * então o blur chegava por cima).
 *
 * Destranca e não tranca mais (latch): depois que a página apareceu, um
 * re-fetch qualquer não pode fazer ela sumir.
 */
export function usePageRevealGate(dataReady: boolean): boolean {
  const ctx = useContext(PageTransitionContext);
  const [open, setOpen] = useState(false);

  // Enquanto os dados não chegam, conta como "página carregando" — é isso
  // que faz o overlay existir.
  useEffect(() => {
    if (!ctx || dataReady) return;
    return ctx.reportNotReady();
  }, [ctx, dataReady]);

  useEffect(() => {
    if (open) return;
    // Fora do provider (página pública): sem coreografia, manda o dado.
    if (!ctx) {
      if (dataReady) setOpen(true);
      return;
    }
    if (dataReady && ctx.covering) setOpen(true);
  }, [ctx, dataReady, open]);

  // Válvula: nunca deixa a página presa por um erro de coreografia.
  useEffect(() => {
    if (open || !dataReady) return;
    const t = window.setTimeout(() => setOpen(true), CONTENT_WATCHDOG);
    return () => window.clearTimeout(t);
  }, [open, dataReady]);

  return open;
}

/**
 * Usado pelo Header pra avisar que começou uma transferência da pílula.
 * O overlay segura a própria entrada até essa animação terminar — senão
 * ele cobriria o header exatamente durante o movimento. Fora do provider
 * (página pública) é no-op.
 */
export function useHeaderAnimSignal() {
  const ctx = useContext(PageTransitionContext);
  return useCallback(
    (durationMs: number) => ctx?.signalHeaderAnim(durationMs),
    [ctx]
  );
}

type LogoPhase = "in" | "out";

function PageTransitionOverlay({
  loading,
  headerAnimUntilRef,
  onCoveringChange,
}: {
  loading: boolean;
  headerAnimUntilRef: React.MutableRefObject<number>;
  onCoveringChange: (covering: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [logoPhase, setLogoPhase] = useState<LogoPhase>("in");
  // Muda a cada exibição: força a logo/overlay a partirem do `initial`
  // de novo (senão o framer-motion continua de onde parou na vez anterior).
  const [runId, setRunId] = useState(0);

  const shownAtRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const showTimerRef = useRef<number | null>(null);

  // Desfoque como NÚMERO, montado na string só na hora de aplicar. Animar
  // "blur(0px)" → "blur(18px)" como texto é frágil (o framer precisa casar
  // a lista de funções dos dois lados), e o prefixo -webkit precisa
  // receber exatamente o mesmo valor pro iOS/Safari.
  const blur = useMotionValue(0);
  const blurCss = useMotionTemplate`blur(${blur}px)`;
  const saindo = logoPhase === "out";

  useEffect(() => {
    if (!visible) return;
    const controls = animate(blur, saindo ? 0 : BLUR_MAX, {
      duration: (saindo ? SETTLE : BLUR_IN) / 1000,
      ease: saindo ? SETTLE_EASE : "easeOut",
    });
    return () => controls.stop();
  }, [visible, saindo, blur]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  // ENTRADA. Agenda a subida do overlay pro fim da animação do header —
  // ele cobre o header inteiro, e subir antes engoliria justamente o
  // movimento da pílula. Sem animação de header (1º carregamento, F5) a
  // espera dá zero e ele sobe na hora.
  //
  // Esta entrada NÃO é cancelada se os dados chegarem antes. Antes era: se
  // a página ficasse pronta durante a espera, o overlay era abortado. Só
  // que agora o conteúdo depende do overlay cobrir pra poder aparecer
  // (ver usePageRevealGate) — abortar aqui deixaria a página presa até o
  // watchdog. E era esse mesmo caminho que produzia o defeito relatado:
  // a página pintava pronta durante a animação do header e só então o
  // blur chegava por cima dela.
  useEffect(() => {
    if (!loading || showTimerRef.current !== null) return;
    const espera = Math.max(0, headerAnimUntilRef.current - Date.now());
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      // shownAt marca quando o overlay APARECEU, não quando a página
      // começou a carregar — é o que MIN_HOLD mede.
      shownAtRef.current = Date.now();
      setRunId((r) => r + 1);
      setLogoPhase("in");
      setVisible(true);
      // Só conta como "cobrindo" depois do desfoque subir inteiro: é esse
      // sinal que libera o conteúdo, e liberar com o blur ainda em 0
      // mostraria a página nítida por um instante.
      later(() => onCoveringChange(true), BLUR_IN);
    }, espera);
  }, [loading, headerAnimUntilRef, onCoveringChange]);

  // SAÍDA. Só depois de o overlay ter aparecido de fato — se os dados
  // chegaram antes disso, esperamos ele subir pra poder descer.
  useEffect(() => {
    if (loading || !visible) return;
    const elapsed = Date.now() - shownAtRef.current;
    const wait = Math.max(0, MIN_HOLD - elapsed);
    const t1 = window.setTimeout(() => {
      setLogoPhase("out");
      const t2 = window.setTimeout(() => {
        setVisible(false);
        onCoveringChange(false);
      }, SETTLE);
      timersRef.current.push(t2);
    }, wait);
    timersRef.current.push(t1);
    return () => {
      window.clearTimeout(t1);
    };
  }, [loading, visible, onCoveringChange]);

  useEffect(
    () => () => {
      clearTimers();
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    },
    []
  );

  if (!visible) return null;

  return (
    <motion.div
      key={`overlay-${runId}`}
      aria-hidden="true"
      // Assim que a saída começa, para de bloquear clique: a página por
      // baixo já está montada e legível, e a saída agora dura 1,6s — seria
      // muito tempo de tela morta esperando o overlay desmontar.
      className={`fixed inset-0 z-[100] flex items-center justify-center ${
        saindo ? "pointer-events-none" : "pointer-events-auto"
      }`}
      // O desfoque é animado como número e montado na string com
      // useMotionTemplate: interpolar "blur(0px)" → "blur(18px)" como texto
      // é frágil, e o -webkit- precisa do mesmo valor pro iOS/Safari.
      // Sem animação de opacidade na saída de propósito: o overlay não tem
      // fundo, só o backdrop-filter. Quando o desfoque chega a 0 ele já é
      // invisível. Fazer a opacidade cair JUNTO somava dois caminhos de
      // desaparecimento e dobrava a velocidade percebida — era metade do
      // motivo da saída parecer abrupta.
      style={{ backdropFilter: blurCss, WebkitBackdropFilter: blurCss }}
    >
      <motion.img
        key={`logo-${runId}`}
        src="/logo.png"
        alt=""
        draggable={false}
        className="w-12 h-12 object-contain select-none"
        initial={{ y: "-130%", opacity: 0 }}
        animate={saindo ? { y: 0, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={
          saindo
            ? // Some junto com o desfoque, na mesma duração e no mesmo
              // easing: é o "sumindo gradualmente conforme a tela carrega".
              { opacity: { duration: SETTLE / 1000, ease: SETTLE_EASE } }
            : {
                opacity: { duration: LOGO_IN / 1000, ease: "easeInOut" },
                y: { delay: LOGO_IN_DELAY / 1000, duration: LOGO_IN / 1000, ease: SWING_TO },
              }
        }
      />
    </motion.div>
  );
}
