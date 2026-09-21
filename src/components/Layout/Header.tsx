import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, Filter, FileText, DollarSign, MessageSquare, Users, Zap, LogOut, Clock, Workflow } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
  // Some do menu no mobile — a rota /funnel-maps continua existindo,
  // só não precisa de espaço na barra de ícones do celular.
  { title: "Mapas de Funil", url: "/funnel-maps", icon: Workflow, hideOnMobile: true },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Financeiro", url: "/financial", icon: DollarSign },
  { title: "Automações",   url: "/automations",        icon: Zap   },
  { title: "Agendamentos", url: "/scheduled-messages", icon: Clock },
];

export const Header = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const isMobile = useIsMobile();
  const [hidden, setHidden] = useState(false);
  const [isMouseAtTop, setIsMouseAtTop] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);

  // ===== Roleta infinita (só mobile) =====
  // Janela fixa de ~5 ícones. O item central é sempre a página ativa: ao
  // arrastar, o item que fica no meio vira a rota atual sozinho (sem
  // precisar tocar nele) — como um seletor de roleta.
  //
  // A lista (sem "Mapas de Funil") é desenhada 3x seguidas — bloco
  // anterior / bloco atual / bloco seguinte — pro loop infinito: se o
  // usuário rolar fundo demais num bloco vizinho, teleportamos o
  // scrollLeft de volta pro bloco do meio na posição equivalente (±1
  // largura de bloco). Como os 3 blocos são idênticos, o salto é
  // imperceptível — efeito de fita sem fim.
  const mobileItems = menuItems.filter((item) => !item.hideOnMobile);
  const middleSetRef = useRef<HTMLDivElement>(null);
  const loopWidthRef = useRef(0);
  const hasCenteredOnceRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const mobilePillRafRef = useRef(false);
  // Pílula do mobile: {x, url} do item mais próximo do centro AGORA — ao
  // contrário da versão anterior (parada no centro), esta vive dentro do
  // próprio <nav> que rola, então ela desliza junto com o conteúdo. O
  // efeito de "migrar" vem de recalcular o alvo (x) a cada frame de scroll
  // — como ela é a MESMA <span>, o navegador anima o transform sozinho
  // (transition abaixo) em vez de simplesmente aparecer/sumir.
  const [mobilePill, setMobilePill] = useState<{ x: number; url: string } | null>(null);

  // Acha, dentro de um container, o elemento (por [data-nav-url]) mais
  // próximo do centro horizontal da faixa visível — é assim que sabemos
  // qual ícone "está no meio" a qualquer momento do arraste.
  const findNearest = useCallback((root: HTMLElement, urlFilter?: string) => {
    const scroller = navRef.current;
    if (!scroller) return null;
    const selector = urlFilter ? `[data-nav-url="${CSS.escape(urlFilter)}"]` : "[data-nav-url]";
    const nodes = root.querySelectorAll<HTMLElement>(selector);
    if (!nodes.length) return null;
    const scrollerRect = scroller.getBoundingClientRect();
    const centerX = scrollerRect.left + scrollerRect.width / 2;
    let best: { el: HTMLElement; url: string; dist: number } | null = null;
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - centerX);
      if (!best || dist < best.dist) {
        best = { el, url: el.dataset.navUrl ?? "", dist };
      }
    });
    return best;
  }, []);

  // Recalcula {x, url} do item mais próximo do centro AGORA e atualiza a
  // pílula viva do mobile — chamada a cada frame de scroll (throttle via
  // rAF em onNavScroll) e uma vez no 1º paint.
  const updateMobilePill = useCallback(() => {
    const scroller = navRef.current;
    if (!scroller) return;
    const nearest = findNearest(scroller);
    if (!nearest) return;
    const navRect = scroller.getBoundingClientRect();
    const elRect = nearest.el.getBoundingClientRect();
    const x = elRect.left - navRect.left + scroller.scrollLeft;
    setMobilePill((prev) =>
      prev && prev.url === nearest.url && Math.abs(prev.x - x) < 0.5 ? prev : { x, url: nearest.url }
    );
  }, [findNearest]);

  const updatePill = useCallback((pathname: string) => {
    const nav = navRef.current;
    const el = itemRefs.current.get(pathname);
    if (!nav || !el) {
      setPill(null);
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = elRect.left - navRect.left + nav.scrollLeft;
    const width = elRect.width;
    // Só atualiza o state se o valor REALMENTE mudou (>0.5px de diferença).
    // Sem isso, qualquer reflow espúrio durante o carregamento da página
    // (fonte custom terminando de carregar, scrollbar aparecendo/sumindo)
    // reagenda a transição do zero a cada disparo do ResizeObserver — com
    // vários dispositivos, isso interrompe a mola repetidas vezes antes
    // dela chegar visualmente ao destino, dando a impressão de "travada".
    setPill((prev) => {
      if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) {
        return prev;
      }
      return { x, width };
    });
  }, []);

  // Lógica para esconder o header ao rolar para baixo e mostrar ao rolar para cima
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  // Mostrar o header se o mouse estiver no topo da tela.
  // Limiar de 90px cobre toda a altura do header (evita cruzar a linha ao
  // passar o mouse por cima dele) e só atualiza o estado quando ele muda de
  // verdade — assim não há re-render em rajada que faz o backdrop-filter
  // piscar aquela "tarja" clara na emenda com os cards.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const atTop = e.clientY < 90;
      setIsMouseAtTop((prev) => (prev === atTop ? prev : atTop));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Recalcula a pílula na troca de rota, e observa resize do item ativo e
  // da barra de nav (labels somem/aparecem em breakpoints, fonte custom
  // ainda carregando, etc.) — o guard em updatePill acima evita que isso
  // reagende a animação à toa quando o valor não mudou de verdade.
  useLayoutEffect(() => {
    if (isMobile) return;
    updatePill(location.pathname);
    const nav = navRef.current;
    const el = itemRefs.current.get(location.pathname);
    if (!nav || !el) return;
    const ro = new ResizeObserver(() => updatePill(location.pathname));
    ro.observe(nav);
    ro.observe(el);
    return () => ro.disconnect();
  }, [location.pathname, updatePill, isMobile]);

  // Mede a largura de 1 bloco (pro loop) sempre que ela mudar (fonte
  // custom terminando de carregar, rotação de tela etc.).
  useLayoutEffect(() => {
    if (!isMobile) return;
    const middle = middleSetRef.current;
    if (!middle) return;
    const measure = () => {
      const w = middle.offsetWidth;
      if (w) loopWidthRef.current = w;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(middle);
    return () => ro.disconnect();
  }, [isMobile]);

  // Centraliza o ícone da rota ativa: no 1º paint, instantâneo (dentro do
  // bloco do meio, pra já nascer centralizado no meio do loop); depois
  // disso, sempre que a rota mudar por FORA da própria roleta (ex.: tocou
  // um card no Dashboard), desliza suavemente até lá — essa é a "animação
  // do botão passando de um ícone para o outro". Se a rota mudou porque a
  // própria roleta assentou nela (dist já ~0), não faz nada — sem isso o
  // gesto do usuário brigaria com este efeito.
  useLayoutEffect(() => {
    if (!isMobile) return;
    const middle = middleSetRef.current;
    if (!middle) return;

    if (!hasCenteredOnceRef.current) {
      const target =
        findNearest(middle, location.pathname)?.el ??
        (middle.firstElementChild as HTMLElement | null);
      target?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      hasCenteredOnceRef.current = true;
      // Posiciona a pílula já no 1º paint (senão ela só apareceria depois
      // do primeiro evento de scroll do usuário).
      updateMobilePill();
      return;
    }

    const scroller = navRef.current;
    if (!scroller) return;
    const nearest = findNearest(scroller, location.pathname);
    if (nearest && nearest.dist > 4) {
      nearest.el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [isMobile, location.pathname, findNearest, updateMobilePill]);

  const onNavScroll = () => {
    if (!isMobile) return;
    const scroller = navRef.current;
    const w = loopWidthRef.current;
    if (scroller && w) {
      // Loop infinito: imediato, a cada evento de scroll — sem isso o
      // usuário eventualmente bate no fim de um dos 3 blocos.
      if (scroller.scrollLeft < w * 0.5) {
        scroller.scrollLeft += w;
      } else if (scroller.scrollLeft > w * 1.5) {
        scroller.scrollLeft -= w;
      }
    }

    // Pílula viva: recalcula o alvo (x, url) a cada frame de scroll — é
    // isso que faz ela "migrar" continuamente enquanto o dedo arrasta a
    // faixa, em vez de só trocar quando o scroll assenta. Throttle via
    // rAF (não a cada evento de scroll bruto, que dispara dezenas de
    // vezes por frame durante inércia) pra não sobrecarregar.
    if (!mobilePillRafRef.current) {
      mobilePillRafRef.current = true;
      requestAnimationFrame(() => {
        mobilePillRafRef.current = false;
        updateMobilePill();
      });
    }

    // Troca de página sozinha quando o scroll assenta: espera ~120ms sem
    // novos eventos de scroll (gesto/inércia acabou) e navega pro item
    // que ficou no meio, se for diferente da rota atual.
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      if (!scroller) return;
      const nearest = findNearest(scroller);
      if (nearest && nearest.url && nearest.url !== location.pathname) {
        navigate(nearest.url);
      }
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  // No mobile o header mora embaixo (bottom tab bar — mais fácil de
  // alcançar com o polegar) e fica sempre visível, sem o esconder/mostrar
  // ao rolar que só faz sentido pra uma barra no topo competindo por
  // espaço com o conteúdo.
  const showHeader = isMobile ? true : (!hidden || isMouseAtTop);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: showHeader ? 0 : (isMobile ? 100 : -100) }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "w-full px-4 sm:px-6 pt-4 fixed left-0 right-0 z-[60] flex justify-center pointer-events-none will-change-transform",
          // Embaixo no mobile (com respiro pra área segura do iPhone),
          // volta pro topo a partir de md.
          "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-0 md:pb-4"
        )}
      >
        <header
          className={cn(
            "liquid-glass h-16 w-full max-w-7xl flex items-center pointer-events-auto",
            // No mobile o espaço é curto (logo + janela de 5 ícones + sair
            // TODOS precisam caber numa tela de ~360-430px) — padding e gap
            // bem mais enxutos que no desktop, onde a nav é flex-1 e
            // absorve a largura sobrando.
            isMobile ? "px-3 gap-1.5" : "px-4 sm:px-6 gap-4"
          )}
          style={{ willChange: "backdrop-filter, transform", transform: "translateZ(0)" }}
        >

          {/* Logo Section */}
          <div
            className={cn(
              "flex items-center shrink-0",
              isMobile ? "pr-1.5 border-r border-white/5" : "mr-2 sm:mr-4 pr-2 sm:pr-4 border-r border-white/5"
            )}
          >
            <img src="/logo.png" alt="Porceli" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          </div>

          {/* Navigation Items - Center Styled. Só ícones (rótulo virou
              tooltip). Quando não cabem todos numa tela estreita, a
              própria barra rola horizontalmente (overflow-x-auto) — sem
              menu escondido atrás de mais um botão. */}
          {isMobile ? (
            // ===== Mobile: roleta com loop infinito =====
            <nav
              ref={navRef}
              onScroll={onNavScroll}
              // Janela fixa de 5 ícones de 40px + 4 vãos de 4px = 216px —
              // junto com logo/sair enxutos, cabe até em telas de ~360px.
              className="relative flex items-center gap-1 h-full w-[216px] max-w-full shrink-0 mx-auto overflow-x-auto scrollbar-hide snap-x snap-mandatory"
              style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
            >
              {/* Pílula de vidro DENTRO da faixa que rola — mesma técnica do
                  desktop (posição calculada em coordenadas do CONTEÚDO,
                  x = elRect.left - navRect.left + scrollLeft), só que aqui o
                  alvo é recalculado a cada frame de scroll (updateMobilePill),
                  não só na troca de rota. Por ser a MESMA <span>, o navegador
                  anima o transition de transform sozinho a cada novo alvo —
                  é isso que faz ela "migrar" fisicamente de um ícone pro
                  outro enquanto o dedo arrasta, em vez de saltar. */}
              {mobilePill && (
                <span
                  aria-hidden="true"
                  // Mesma largura do slot do ícone (h-10 w-10 = 40px): como
                  // a pílula é alinhada pela borda esquerda (left:0 +
                  // translateX), qualquer diferença de largura vira um
                  // desalinhamento visível puxado pra um lado — não some
                  // sozinho mesmo estando "no lugar certo" em x.
                  className="lqg-lens lqg-lens--nav absolute left-0 top-1/2 w-10 h-10 -translate-y-1/2 rounded-full pointer-events-none z-0"
                  style={{
                    transform: `translate(${mobilePill.x}px, -50%)`,
                    transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              )}
              {[0, 1, 2].map((setIndex) => (
                <div
                  key={setIndex}
                  ref={setIndex === 1 ? middleSetRef : undefined}
                  className="relative z-10 flex items-center gap-1 shrink-0"
                >
                  {mobileItems.map((item) => {
                    // Enquanto a pílula ainda não mediu nada (1er frame),
                    // cai pra rota atual; depois disso, quem manda é o item
                    // mais próximo do centro AGORA — não espera a navegação
                    // de verdade (essa só acontece quando o scroll assenta).
                    const isHighlighted = mobilePill ? mobilePill.url === item.url : location.pathname === item.url;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${setIndex}-${item.title}`}
                        to={item.url}
                        title={item.title}
                        data-nav-url={item.url}
                        className="snap-center h-10 w-10 flex items-center justify-center shrink-0"
                      >
                        <Icon className={cn("w-5 h-5 transition-colors duration-300", isHighlighted ? "lqg-text text-white" : "text-white/40")} />
                        <span className="sr-only">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          ) : (
            // ===== Desktop: lista única com a pílula deslizante =====
            <nav
              ref={navRef}
              className="relative flex items-center justify-center gap-0.5 sm:gap-1 flex-1 h-full overflow-x-auto scrollbar-hide"
            >
              {/* Causa raiz real (achada com diagnostico no navegador do
                  usuario, não na minha ferramenta de teste): <nav> é um flex
                  container com justify-center. Um filho position:absolute
                  SEM `left` explícito não usa "0" como base — pela spec de
                  Flexbox, a posição estática de um item absoluto dentro de
                  um container com justify-content:center é calculada como
                  se ele estivesse CENTRALIZADO entre os itens, não colado
                  na borda esquerda. Meu cálculo de x sempre assumiu base
                  zero (nav.left), então o transform aplicado ficava certo
                  MATEMATICAMENTE mas renderizava deslocado pelo offset
                  dessa centralização "fantasma" — daí a pílula aparecer
                  sempre num item diferente do calculado, de forma
                  consistente nas 3 tentativas anteriores (layoutId,
                  motion.span, CSS transition), já que nenhuma delas fixava
                  essa base. `left: 0` remove a ambiguidade: a base passa a
                  ser sempre a borda esquerda do <nav>, batendo com a conta
                  em JS (elRect.left - navRect.left + nav.scrollLeft). */}
              {pill && (
                <span
                  // top-1/2 + translateY(-50%): os itens do menu (h-10) ficam
                  // centralizados verticalmente dentro do <nav>, que é mais
                  // alto (h-full, herda os 64px do header) via items-center —
                  // top-0 alinhava a pílula na BORDA do nav, não no centro
                  // onde os itens realmente estão (12px de diferença, testado
                  // e confirmado no navegador do usuário). Centralizar do
                  // mesmo jeito que o flexbox centraliza os itens elimina
                  // essa conta duplicada e qualquer chance de dessincronizar.
                  className="lqg-lens lqg-lens--nav absolute left-0 top-1/2 h-10 rounded-full pointer-events-none z-0"
                  style={{
                    transform: `translate(${pill.x}px, -50%)`,
                    width: pill.width,
                    transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              )}
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    title={item.title}
                    className="h-10 flex items-center shrink-0"
                  >
                    <div
                      ref={(el) => {
                        if (el) itemRefs.current.set(item.url, el);
                        else itemRefs.current.delete(item.url);
                      }}
                      className="group relative isolate z-10 w-10 md:w-11 h-full flex items-center justify-center rounded-full transform-gpu will-change-transform"
                    >
                      {!isActive && (
                        <span className="absolute inset-0 -z-10 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      )}
                      <Icon className={cn(
                        "relative z-10 w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors",
                        isActive ? "lqg-text text-white" : "text-white/40 group-hover:text-white/70"
                      )} />
                      <span className="sr-only">{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Actions */}
          <div
            className={cn(
              "flex items-center shrink-0",
              isMobile ? "pl-1.5 border-l border-white/5" : "ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-white/5"
            )}
          >
            <button
              onClick={() => logout()}
              className={cn(
                "text-white/40 hover:text-red-500 transition-all duration-300",
                isMobile ? "p-1.5" : "p-2 sm:p-2.5"
              )}
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
      </motion.div>
    </AnimatePresence>
  );
};
