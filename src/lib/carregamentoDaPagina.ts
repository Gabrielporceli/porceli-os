/**
 * "Tem busca em andamento?" — o sinal que as esperas de carregamento usam.
 *
 * O `usePageReady` só enxergava o React Query (`useIsFetching`). O que busca
 * direto no Supabase — notas, pauta, quadros, mapas de funil, agenda — passava
 * despercebido: a página aparecia antes desses dados e se reorganizava quando
 * eles chegavam. Toda chamada do cliente do Supabase passa pelo `fetchContado`
 * abaixo (ligado em integrations/supabase/client.ts), venha de onde vier.
 */

let pendentes = 0;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((f) => f());

export function comecouCarregamento(): () => void {
  pendentes++;
  avisar();
  let terminou = false;
  return () => {
    if (terminou) return;
    terminou = true;
    pendentes--;
    avisar();
  };
}

export function carregamentosPendentes(): number {
  return pendentes;
}

/**
 * Páginas que ainda estão no `PageLoader` (dados não chegaram). Contador à parte
 * de propósito: o `usePageReady` espera as BUSCAS para liberar a página, e se o
 * PageLoader entrasse nesse mesmo contador ele esperaria a si mesmo — a página
 * só saía pelo teto de 6 s. Quem soma os dois é só o `QuandoPronto`.
 */
let segurando = 0;

export function paginaSegurando(): () => void {
  segurando++;
  avisar();
  let terminou = false;
  return () => {
    if (terminou) return;
    terminou = true;
    segurando--;
    avisar();
  };
}

/** Buscas em andamento + páginas ainda no PageLoader: o que o QuandoPronto espera. */
export function algoCarregando(): boolean {
  return pendentes > 0 || segurando > 0;
}

export function aoMudarCarregamento(f: () => void): () => void {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

/** `fetch` que conta a requisição enquanto ela não termina (com sucesso ou não). */
export const fetchContado: typeof fetch = async (entrada, init) => {
  const terminar = comecouCarregamento();
  try {
    return await fetch(entrada, init);
  } finally {
    terminar();
  }
};
