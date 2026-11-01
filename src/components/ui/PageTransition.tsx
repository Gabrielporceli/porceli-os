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

/**
 * Troca de página SEM véu.
 *
 * Antes, a cada troca a tela inteira desfocava com a logo no meio e o conteúdo
 * era revelado pela saída do desfoque. Agora a página nova monta escondida e
 * aparece inteira, suave, quando terminou de carregar — o `QuandoPronto` do
 * CRMLayout, o mesmo das abas. Igual ao Porceli Tracking.
 *
 * Este arquivo continua existindo pelos nomes que as páginas e o Header já
 * usam: `PageTransitionProvider`, `usePageRevealGate` e `useHeaderAnimSignal`.
 */

interface PageTransitionContextValue {
  /** Chamado pelo Header quando começa uma transferência da pílula. */
  signalHeaderAnim: (durationMs: number) => void;
  /** Instante (epoch ms) em que a animação do header termina. */
  headerAnimUntilRef: React.MutableRefObject<number>;
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const headerAnimUntilRef = useRef(0);
  const signalHeaderAnim = useCallback((durationMs: number) => {
    headerAnimUntilRef.current = Date.now() + durationMs;
  }, []);
  const value = useMemo(() => ({ signalHeaderAnim, headerAnimUntilRef }), [signalHeaderAnim]);
  return <PageTransitionContext.Provider value={value}>{children}</PageTransitionContext.Provider>;
}

/**
 * Portão do conteúdo: "os dados chegaram?" → "pode desenhar?".
 *
 * Sem véu não há mais o que esperar além dos dados. Continua travando aberto
 * (latch): depois que a página apareceu, um re-fetch qualquer não pode fazer
 * ela sumir.
 */
export function usePageRevealGate(dataReady: boolean): boolean {
  const [open, setOpen] = useState(dataReady);
  useEffect(() => {
    if (dataReady && !open) setOpen(true);
  }, [dataReady, open]);
  return open || dataReady;
}

/**
 * Usado pelo Header pra avisar que começou uma transferência da pílula. Fora do
 * provider (página pública) é no-op.
 */
export function useHeaderAnimSignal() {
  const ctx = useContext(PageTransitionContext);
  return useCallback(
    (durationMs: number) => ctx?.signalHeaderAnim(durationMs),
    [ctx]
  );
}
