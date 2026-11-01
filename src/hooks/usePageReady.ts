import { useState, useEffect, useRef } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePageRevealGate } from "@/components/ui/PageTransition";
import { aoMudarCarregamento, carregamentosPendentes } from "@/lib/carregamentoDaPagina";

/**
 * Teto da espera pelas buscas diretas ao Supabase: uma busca que se repete sem
 * parar (sincronização, polling) nunca pode prender a página no carregando.
 */
const TETO_BUSCAS_MS = 6000;

/**
 * Retorna `true` quando os dados da página chegaram: queries do React Query,
 * buscas diretas ao Supabase (notas, pauta, agenda) e o `extraLoading`.
 *
 * Enquanto é false a página desenha o `<PageLoader />`, que conta como
 * "carregando" — e o `QuandoPronto` do CRMLayout só mostra a página quando
 * ela trocou o PageLoader pelo conteúdo, tudo junto e suave (sem véu).
 *
 * @param extraLoading - loading adicional de hooks useState (ex: useLeads)
 */
export function usePageReady(extraLoading = false): boolean {
  const fetchingCount = useIsFetching();
  const [isReady, setIsReady] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const hasFetchedRef = useRef(false);

  // Buscas que não passam pelo React Query. Depois do teto, deixam de contar.
  const [buscasDiretas, setBuscasDiretas] = useState(carregamentosPendentes());
  const [tetoPassou, setTetoPassou] = useState(false);
  useEffect(() => {
    const parar = aoMudarCarregamento(() => setBuscasDiretas(carregamentosPendentes()));
    const teto = setTimeout(() => setTetoPassou(true), TETO_BUSCAS_MS);
    return () => { parar(); clearTimeout(teto); };
  }, []);
  const esperandoBuscas = buscasDiretas > 0 && !tetoPassou;

  useEffect(() => {
    if (fetchingCount > 0 || extraLoading || esperandoBuscas) {
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
  }, [fetchingCount, extraLoading, esperandoBuscas, isReady]);

  return usePageRevealGate(isReady);
}
