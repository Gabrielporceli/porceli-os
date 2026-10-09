import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

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
 */
export function MasterDetail<T>({
  items, getKey, selectedKey, onSelect, renderRow, children, minHeight = 280, measureKey,
}: MasterDetailProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
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
