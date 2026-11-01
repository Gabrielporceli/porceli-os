import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { algoCarregando, aoMudarCarregamento } from "@/lib/carregamentoDaPagina";
import { cn } from "@/lib/utils";

/** A rede precisa ficar quieta por este tempo (uma busca costuma puxar outra). */
const CALMA_MS = 150;
/** Teto: busca pendurada nunca prende a área escondida. */
const TETO_MS = 6000;
/**
 * Mínimo escondido. Sem ele, tela que carregava na hora sumia por ~150 ms e
 * voltava — lia como piscada, não como transição.
 */
const MINIMO_MS = 250;
/** Duração do aparecimento. */
const APARECER_MS = 450;
/** Espera curta não mostra a logo — só o aparecimento suave. */
const LOGO_APOS_MS = 400;
/**
 * Logo que entrou fica no mínimo isto. Sem o mínimo, tela que ficava pronta
 * logo depois de a logo surgir fazia ela aparecer e sumir num relance (piscava).
 */
const LOGO_MINIMO_MS = 700;

/**
 * "Um QuandoPronto acima ainda está escondendo esta área." Aí a espera é dele:
 * o de dentro (aba) não esconde de novo nem mostra a própria logo. Sem isto, a
 * logo da aba entrava invisível por baixo da página escondida e o mínimo dela
 * segurava a aba depois que a página aparecia — surgia uma segunda logo no topo.
 */
const AcimaEscondendo = createContext(false);

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
export function QuandoPronto({ chave, children, className, tela = false }: {
  chave: string;
  children: ReactNode;
  className?: string;
  /**
   * Página inteira (layouts): a logo fica no centro da TELA, descontando a barra
   * lateral. Sem isto (abas), fica logo abaixo das pílulas, perto do conteúdo.
   */
  tela?: boolean;
}) {
  const reduzir = useReducedMotion();
  const [pronto, setPronto] = useState(true);
  const [mostrarLogo, setMostrarLogo] = useState(false);
  const acimaEscondendo = useContext(AcimaEscondendo);
  const acimaRef = useRef(acimaEscondendo);
  acimaRef.current = acimaEscondendo;
  // Chave já tratada pelo efeito. No render em que a chave muda, os filhos já
  // precisam saber que esta área vai esconder (o efeito daqui roda depois dos deles).
  const chaveVista = useRef<string | null>(null);

  // Antes da pintura: a área nova nunca aparece pela metade nem por um quadro.
  useLayoutEffect(() => {
    chaveVista.current = chave;
    const minha = !acimaRef.current;
    setPronto(!minha);
    setMostrarLogo(false);
  }, [chave]);

  useEffect(() => {
    if (acimaRef.current) return;
    let calma: ReturnType<typeof setTimeout> | undefined;
    let segura: ReturnType<typeof setTimeout> | undefined;
    let terminou = false;
    let logoDesde: number | null = null;
    const inicio = Date.now();
    const revelar = () => {
      if (terminou) return;
      // Nunca antes do mínimo; com a logo na tela, nem antes do mínimo dela.
      const falta = Math.max(
        MINIMO_MS - (Date.now() - inicio),
        logoDesde === null ? 0 : LOGO_MINIMO_MS - (Date.now() - logoDesde),
      );
      if (falta > 0) {
        clearTimeout(segura);
        segura = setTimeout(revelar, falta);
        return;
      }
      terminou = true;
      setPronto(true);
    };
    const avaliar = () => {
      clearTimeout(calma);
      if (algoCarregando()) return;
      calma = setTimeout(() => { if (!algoCarregando()) revelar(); }, CALMA_MS);
    };
    const parar = aoMudarCarregamento(avaliar);
    // Depois dos efeitos dos filhos: é neles que as buscas começam.
    const primeiro = setTimeout(avaliar, 0);
    // Logo só se a espera não for curta — em tela rápida ela nem aparece.
    const logo = setTimeout(() => { logoDesde = Date.now(); setMostrarLogo(true); }, LOGO_APOS_MS);
    const teto = setTimeout(revelar, TETO_MS);
    return () => {
      terminou = true;
      parar();
      clearTimeout(calma);
      clearTimeout(segura);
      clearTimeout(primeiro);
      clearTimeout(logo);
      clearTimeout(teto);
    };
  }, [chave]);

  const escondendo = acimaEscondendo || !pronto || chaveVista.current !== chave;

  return (
    <AcimaEscondendo.Provider value={escondendo}>
    <div className={cn("relative", !pronto && "min-h-[240px]", className)}>
      <div
        aria-busy={!pronto}
        className={cn(!pronto && "pointer-events-none")}
        style={{
          opacity: pronto ? 1 : 0,
          transition: pronto && !reduzir ? `opacity ${APARECER_MS}ms ease-out` : undefined,
        }}
      >
        {children}
      </div>
      {!pronto && mostrarLogo && (
        <div
          role="status"
          aria-label="Carregando"
          className={cn(
            "aparece-ja flex justify-center",
            tela
              ? "pointer-events-none fixed inset-0 z-40 items-center md:pl-[104px]"
              : "absolute inset-x-0 top-24",
          )}
        >
          <img src="/logo.png" alt="" className={cn("logo-respirando object-contain", tela ? "h-14 w-14" : "h-9 w-9")} />
        </div>
      )}
    </div>
    </AcimaEscondendo.Provider>
  );
}
