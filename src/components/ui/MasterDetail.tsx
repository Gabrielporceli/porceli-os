import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { appBackgroundStyle } from '@/lib/appBackground';

/** Cor do painel e da aba selecionada: a mesma, pra as duas se fundirem. */
export const PANEL_BG = 'rgba(255,255,255,0.07)';
/** Altura de cada linha da coluna. As linhas renderizadas DEVEM ter esta altura. */
export const MASTER_ROW_H = 52;
/** Esmaece o fim de um nome comprido em vez de cortá-lo seco. */
export const NAME_FADE = {
  maskImage: 'linear-gradient(to right, black calc(100% - 28px), transparent)',
  WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 28px), transparent)',
};

const fadeStyle = (fade: { top: boolean; bottom: boolean }) => {
  const g = `linear-gradient(to bottom, transparent 0%, black ${fade.top ? '40px' : '0px'}, black calc(100% - ${fade.bottom ? '40px' : '0px'}), transparent 100%)`;
  return { maskImage: g, WebkitMaskImage: g };
};

interface MasterDetailProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Chave do item selecionado (já resolvida: nunca nula se há itens). */
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Conteúdo da linha; o botão, a aba e a altura são daqui. */
  renderRow: (item: T, selected: boolean) => ReactNode;
  /** Conteúdo do painel do item selecionado (rola sozinho). */
  children: ReactNode;
  /** Altura mínima do bloco, em px. */
  minHeight?: number;
  /** Muda quando algo ACIMA do bloco muda de tamanho: refaz a medida da altura. */
  measureKey?: unknown;
  /** Celular: nome da lista, mostrado no botão de voltar do detalhe ("← Clientes"). */
  rotuloLista?: string;
  /** Celular: repete a linha do item (nome e resumo) no topo do detalhe, p/ quem não traz o nome no painel. */
  linhaNoDetalhe?: boolean;
}

/**
 * Lista de itens à esquerda e painel de detalhes à direita, dentro de um card
 * cinza só. O item selecionado vira uma "aba" da cor do painel, grudada nele
 * com cantos côncavos, e desliza ao trocar de item. É o mesmo layout da lista
 * de contratos, usado também pela lista de clientes.
 *
 * A aba fica FORA da área com máscara de fade, senão o fade a apagaria e ela
 * descolaria do painel; a posição dela é (índice × altura da linha − rolagem).
 * A altura do bloco é o que sobra da janela abaixo dele, pra a página não
 * ganhar rolagem por causa dele.
 *
 * No celular a coluna de 220px não cabe ao lado do painel (sobravam ~95px
 * pra ele), e abrir o detalhe embaixo da linha (um "sanfonado") deixava a
 * página comprida e confusa. Lá são duas telas, como nos apps do iPhone:
 * primeiro a LISTA (uma linha por item, com o resumo à vista); tocar numa
 * linha abre o DETALHE sozinho, com "← Voltar" no topo. O botão voltar do
 * aparelho (ou o gesto de arrastar da borda) também volta pra lista, porque o
 * detalhe aberto ganha uma entrada no histórico. É o mesmo `renderRow` e os
 * mesmos `children`, só em outra disposição.
 */
export function MasterDetail<T>({
  items, getKey, selectedKey, onSelect, renderRow, children, minHeight = 280, measureKey, rotuloLista = 'Voltar', linhaNoDetalhe = false,
}: MasterDetailProps<T>) {
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Celular: o detalhe está aberto? (a lista é a tela de entrada)
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [fade, setFade] = useState({ top: false, bottom: false });
  const [height, setHeight] = useState<number>();

  const tabScroll = useMotionValue(0);
  const tabOffset = useSpring(0, { stiffness: 420, damping: 38 });
  const tabTarget = useRef<number | null>(null);
  const tabY = useTransform(() => tabOffset.get() - tabScroll.get());
  const panelTopRadius = useTransform(() => {
    const y = tabY.get();
    if (y + MASTER_ROW_H <= 0) return 16;
    return y <= 0 ? 0 : Math.min(16, y);
  });
  const panelBottomRadius = useTransform(() => {
    const h = listRef.current?.clientHeight ?? Infinity;
    const gap = h - (tabY.get() + MASTER_ROW_H);
    if (tabY.get() >= h) return 16;
    return gap <= 0 ? 0 : Math.min(16, gap);
  });

  const updateFade = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    tabScroll.set(el.scrollTop);
    setFade({
      top: el.scrollTop > 0,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    });
  }, [tabScroll]);
  useEffect(() => {
    const raf = requestAnimationFrame(updateFade);
    return () => cancelAnimationFrame(raf);
  }, [updateFade, items.length, height]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(minHeight, window.innerHeight - top - 32));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [minHeight, measureKey]);

  const target = Math.max(0, items.findIndex((i) => getKey(i) === selectedKey)) * MASTER_ROW_H;
  if (tabTarget.current !== target) {
    if (tabTarget.current === null) tabOffset.jump(target);
    else tabOffset.set(target);
    tabTarget.current = target;
  }

  // Celular: abrir o detalhe cria uma entrada no histórico; o botão/gesto de
  // voltar do aparelho a desfaz e a tela volta pra lista em vez de sair da página.
  useEffect(() => {
    if (!isMobile) return;
    const aoVoltar = () => setDetalheAberto(false);
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, [isMobile]);
  // Sai do celular (girou a tela, redimensionou) com o detalhe aberto: fecha.
  useEffect(() => {
    if (!isMobile) setDetalheAberto(false);
  }, [isMobile]);

  const abrirDetalhe = (key: string) => {
    onSelect(key);
    setDetalheAberto(true);
    try {
      window.history.pushState({ masterDetail: true }, '');
    } catch {
      /* sem histórico: o botão "Voltar" da tela continua funcionando */
    }
    window.scrollTo({ top: 0 });
  };
  const fecharDetalhe = () => {
    // Se há a entrada que criamos, desfaz pelo histórico; senão só fecha.
    if (window.history.state?.masterDetail) window.history.back();
    else setDetalheAberto(false);
  };

  if (isMobile) {
    if (detalheAberto) {
      return (
        // Tela própria: cobre a página inteira (busca, números e filtros ficam
        // por baixo) e rola sozinha; a barra de ícones (z-60) continua por cima.
        <div
          ref={boxRef}
          className="fixed inset-0 z-[55] space-y-3 overflow-y-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
          style={appBackgroundStyle}
        >
          <button
            type="button"
            onClick={fecharDetalhe}
            className="flex h-10 items-center gap-2 rounded-full bg-white/10 pl-3 pr-4 text-xs font-bold uppercase tracking-widest text-white"
          >
            <span aria-hidden="true">←</span>
            {rotuloLista}
          </button>
          {linhaNoDetalhe && (() => {
            const atual = items.find((i) => getKey(i) === selectedKey);
            return atual ? (
              <div className="surface-flat no-elevation relative flex h-[60px] items-center gap-3 rounded-2xl px-4">{renderRow(atual, true)}</div>
            ) : null;
          })()}
          <div className="surface-flat no-elevation rounded-3xl p-2.5">
            <div className="space-y-3 rounded-2xl p-2.5" style={{ background: PANEL_BG }}>
              {children}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div ref={boxRef} className="space-y-2">
        {items.map((item) => {
          const key = getKey(item);
          return (
            <button
              key={key}
              type="button"
              onClick={() => abrirDetalhe(key)}
              className="surface-flat no-elevation relative flex h-[60px] w-full items-center gap-3 rounded-2xl px-4 text-left active:brightness-125"
            >
              {/* `true`: na lista todos aparecem como "escolhidos" (nome em
                  branco e o resumo à vista, não o texto apagado de aba). */}
              {renderRow(item, true)}
              <span aria-hidden="true" className="relative ml-auto shrink-0 text-lg text-white/30">›</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={boxRef} className="surface-flat no-elevation flex rounded-3xl p-3.5" style={{ height: height ?? 'calc(100vh - 320px)' }}>
      {/* Coluna de itens */}
      <div className="relative w-[220px] shrink-0 overflow-hidden">
        <motion.div
          className="pointer-events-none absolute left-0 right-0 top-0 h-[52px] rounded-l-2xl"
          style={{ y: tabY, background: PANEL_BG }}
        >
          {/* Cantos côncavos que fundem a aba ao painel */}
          <span className="absolute -top-4 right-0 h-4 w-4" style={{ background: `radial-gradient(circle at top left, transparent 15.5px, ${PANEL_BG} 16px)` }} />
          <span className="absolute -bottom-4 right-0 h-4 w-4" style={{ background: `radial-gradient(circle at bottom left, transparent 15.5px, ${PANEL_BG} 16px)` }} />
        </motion.div>
        <div ref={listRef} onScroll={updateFade} className="relative h-full overflow-y-auto scrollbar-hide" style={fadeStyle(fade)}>
          {items.map((item) => {
            const key = getKey(item);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className="relative flex h-[52px] w-full items-center gap-3 px-4 text-left"
              >
                {renderRow(item, key === selectedKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel — a aba selecionada se funde a ele */}
      <motion.div
        className="min-w-0 flex-1 overflow-hidden rounded-2xl"
        style={{ background: PANEL_BG, borderTopLeftRadius: panelTopRadius, borderBottomLeftRadius: panelBottomRadius }}
      >
        <div className="h-full space-y-3 overflow-y-auto scrollbar-hide p-4">{children}</div>
      </motion.div>
    </div>
  );
}
