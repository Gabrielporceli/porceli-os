import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { APROVACOES_MUDARAM } from "@/features/agents/Aprovacoes";

/** Tempo fora do app a partir do qual os dados são buscados de novo. */
const REBUSCAR_APOS_MS = 60_000;
/** Tempo fora do app a partir do qual a página inteira recarrega. */
const RECARREGAR_APOS_MS = 20 * 60_000;

/** App aberto pelo ícone da tela de início (PWA), não por uma aba do navegador. */
export const appInstalado = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * O app instalado na tela de início não tem botão de recarregar nem "puxar
 * para atualizar", e fica dias vivo em segundo plano: sem isto, quem volta
 * pra ele vê os números de quando saiu.
 *
 * Ao voltar depois de 1 min fora, rebusca o que usa react-query e as
 * aprovações. Depois de 20 min, recarrega a página, porque boa parte das
 * telas (calendário, notas, agentes) busca por conta própria e não ouve o
 * react-query. O recarregamento não acontece com um modal aberto ou um campo
 * em foco, pra não jogar fora o que estava sendo digitado.
 *
 * Só vale no app instalado: no navegador a escolha continua sendo
 * `refetchOnWindowFocus: false` (ver o queryClient em App.tsx).
 */
export function useAtualizarAoVoltar(queryClient: QueryClient) {
  useEffect(() => {
    if (!appInstalado()) return;
    let escondidoEm: number | null = null;
    const aoMudar = () => {
      if (document.visibilityState === "hidden") {
        escondidoEm = Date.now();
        return;
      }
      if (escondidoEm === null) return;
      const fora = Date.now() - escondidoEm;
      escondidoEm = null;
      if (fora < REBUSCAR_APOS_MS) return;

      const ativo = document.activeElement;
      const digitando =
        ativo instanceof HTMLElement &&
        (ativo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName));
      const modalAberto = !!document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (fora >= RECARREGAR_APOS_MS && !digitando && !modalAberto) {
        window.location.reload();
        return;
      }
      queryClient.invalidateQueries();
      window.dispatchEvent(new Event(APROVACOES_MUDARAM));
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, [queryClient]);
}
