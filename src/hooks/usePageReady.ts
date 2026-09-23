import { useState, useEffect, useRef } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePageRevealGate } from "@/components/ui/PageTransition";

/**
 * Retorna `true` quando a página pode DESENHAR — o que são duas coisas:
 *
 *   1. os dados chegaram (queries do React Query + o `extraLoading`), e
 *   2. a transição de página liberou (ver usePageRevealGate).
 *
 * O item 2 existe porque, com os dados em cache, a página ficava pronta
 * ANTES de o overlay de carregamento subir: ela pintava nítida, o blur
 * chegava por cima e sumia logo em seguida. Agora o conteúdo espera o
 * desfoque estar cobrindo, monta escondido atrás dele e é revelado pela
 * saída — nunca aparece nítido antes da hora.
 *
 * Fora do CRMLayout (página pública) não há transição e vale só o item 1.
 *
 * @param extraLoading - loading adicional de hooks useState (ex: useLeads)
 */
export function usePageReady(extraLoading = false): boolean {
  const fetchingCount = useIsFetching();
  const [isReady, setIsReady] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (fetchingCount > 0 || extraLoading) {
      hasFetchedRef.current = true;
      return;
    }
    if (isReady) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const minDelay = 400;
    const extra = hasFetchedRef.current ? 200 : 0;
    const remaining = Math.max(0, minDelay - elapsed) + extra;

    const t = setTimeout(() => setIsReady(true), remaining);
    return () => clearTimeout(t);
  }, [fetchingCount, extraLoading, isReady]);

  return usePageRevealGate(isReady);
}
