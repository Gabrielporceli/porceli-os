import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { algoCarregando, aoMudarCarregamento } from "@/lib/carregamentoDaPagina";
import { cn } from "@/lib/utils";

/** A rede precisa ficar quieta por este tempo (uma busca costuma puxar outra). */
const CALMA_MS = 150;
/** Teto: busca pendurada nunca prende a área escondida. */
const TETO_MS = 6000;

/**
 * Mostra a área (uma aba) só quando ela inteira carregou, e de uma vez, com um
 * aparecimento suave.
 *
 * A transição de página já espera os dados na troca de ROTA. Trocar de aba
 * dentro da página não muda a rota: cada parte buscava os próprios dados e
 * aparecia num momento diferente, e a tela ia se reorganizando. Aqui é o mesmo
 * sinal ("nenhuma busca ao Supabase em andamento", lib/carregamentoDaPagina.ts)
 * para a troca de aba.
 *
 * O conteúdo fica montado (invisível) enquanto espera: é ele que dispara as
 * buscas, e assim já entra com o tamanho certo. `chave` muda = espera de novo,
 * sem remontar ninguém. Sem nada a buscar, a espera é só a calma de 150 ms: a
 * troca de aba vira um aparecimento curto, nunca um corte seco.
 */
export function QuandoPronto({ chave, children, className }: { chave: string; children: ReactNode; className?: string }) {
  const reduzir = useReducedMotion();
  const [pronto, setPronto] = useState(true);
  const [mostrarLogo, setMostrarLogo] = useState(false);

  // Antes da pintura: a área nova nunca aparece pela metade nem por um quadro.
  useLayoutEffect(() => { setPronto(false); setMostrarLogo(false); }, [chave]);

  useEffect(() => {
    let calma: ReturnType<typeof setTimeout> | undefined;
    let terminou = false;
    const revelar = () => { if (!terminou) { terminou = true; setPronto(true); } };
    const avaliar = () => {
      clearTimeout(calma);
      if (algoCarregando()) return;
      calma = setTimeout(() => { if (!algoCarregando()) revelar(); }, CALMA_MS);
    };
    const parar = aoMudarCarregamento(avaliar);
    // Depois dos efeitos dos filhos: é neles que as buscas começam.
    const primeiro = setTimeout(avaliar, 0);
    // Logo só se a espera não for instantânea — em aba rápida ela nem aparece.
    const logo = setTimeout(() => setMostrarLogo(true), 350);
    const teto = setTimeout(revelar, TETO_MS);
    return () => {
      terminou = true;
      parar();
      clearTimeout(calma);
      clearTimeout(primeiro);
      clearTimeout(logo);
      clearTimeout(teto);
    };
  }, [chave]);

  return (
    <div className={cn("relative", !pronto && "min-h-[240px]", className)}>
      <div
        aria-busy={!pronto}
        className={cn(!pronto && "pointer-events-none")}
        style={{
          opacity: pronto ? 1 : 0,
          transition: pronto && !reduzir ? "opacity 350ms ease-out" : undefined,
        }}
      >
        {children}
      </div>
      {!pronto && mostrarLogo && (
        <div role="status" aria-label="Carregando" className="aparece-devagar absolute inset-x-0 top-24 flex justify-center">
          <img src="/logo.png" alt="" className="logo-respirando h-9 w-9 object-contain" />
        </div>
      )}
    </div>
  );
}
