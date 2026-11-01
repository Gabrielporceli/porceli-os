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
