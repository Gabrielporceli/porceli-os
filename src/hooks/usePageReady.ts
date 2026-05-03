import { useState, useEffect, useRef } from "react";
import { useIsFetching } from "@tanstack/react-query";

/**
 * Retorna `true` quando todas as queries React Query terminaram e o
 * tempo mínimo de loading passou. Garante que animações sempre partem
 * do zero com dados completos.
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

  return isReady;
}
