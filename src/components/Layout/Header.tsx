import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, Filter, FileText, DollarSign, MessageSquare, Users, Zap, LogOut, Clock, Workflow } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
  { title: "Mapas de Funil", url: "/funnel-maps", icon: Workflow },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Financeiro", url: "/financial", icon: DollarSign },
  { title: "Automações",   url: "/automations",        icon: Zap   },
  { title: "Agendamentos", url: "/scheduled-messages", icon: Clock },
];

export const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isMouseAtTop, setIsMouseAtTop] = useState(false);

  // Posição/largura reais da pílula ativa, medidas via DOM — não via
  // layoutId. O layoutId do Framer Motion tira uma "foto" da posição
  // antes/depois pra animar entre elas, e tenta compensar scroll da
  // página nessa conta; como o header é `position: fixed` (não rola de
  // verdade), essa compensação fica errada quando a página está rolada
  // no momento da troca de rota — a pílula "nasce" deslocada pela
  // distância do scroll (por isso parecia vir "de baixo"). Medindo a
  // posição real do item ativo (getBoundingClientRect, imune a scroll
  // já que o header não se move com a página) e animando um `x`/`width`
  // explícitos, o resultado é sempre correto, independente de scroll.
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);

  const updatePill = useCallback((pathname: string) => {
    const nav = navRef.current;
    const el = itemRefs.current.get(pathname);
    if (!nav || !el) {
      setPill(null);
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPill({ x: elRect.left - navRect.left + nav.scrollLeft, width: elRect.width });
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

  // Recalcula a pílula na troca de rota e em qualquer resize do item ativo
  // ou da barra de nav (labels aparecem/somem em breakpoints diferentes).
  useLayoutEffect(() => {
    updatePill(location.pathname);
    const nav = navRef.current;
    const el = itemRefs.current.get(location.pathname);
    if (!nav || !el) return;
    const ro = new ResizeObserver(() => updatePill(location.pathname));
    ro.observe(nav);
    ro.observe(el);
    return () => ro.disconnect();
  }, [location.pathname, updatePill]);

  const showHeader = !hidden || isMouseAtTop;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 0 }}
        animate={{ y: showHeader ? 0 : -100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full px-6 py-4 flex justify-center fixed top-0 left-0 right-0 z-[60] pointer-events-none will-change-transform"
      >
        <header
          className="liquid-glass h-16 w-full max-w-7xl flex items-center px-6 gap-4 pointer-events-auto"
          style={{ willChange: "backdrop-filter, transform", transform: "translateZ(0)" }}
        >

          {/* Logo Section */}
          <div className="flex items-center mr-4 pr-4 border-r border-white/5">
            <img src="/logo.png" alt="Porceli" className="w-8 h-8 object-contain" />
          </div>

          {/* Navigation Items - Center Styled */}
          <nav
            ref={navRef}
            className="relative flex items-center justify-center gap-1 flex-1 h-full overflow-x-auto scrollbar-hide"
          >
            {/* Pílula de vidro única, medida via DOM (ver comentário no
                useLayoutEffect acima) — desliza até a posição real do item
                ativo em vez de "pular" entre instâncias condicionais. */}
            {pill && (
              <motion.span
                className="lqg-lens lqg-lens--nav absolute top-0 h-10 rounded-full pointer-events-none z-0"
                initial={false}
                animate={{ x: pill.x, width: pill.width }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {menuItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className="h-10 flex items-center shrink-0"
                >
                  {/*
                    IMPORTANTE: o hover NUNCA deve mudar background-color aqui.
                    background-color é uma propriedade de "paint" — muda-la força
                    o Chrome a re-rasterizar a camada, o que recompõe o
                    backdrop-filter do header e acende uma tarja sobre os cards
                    abaixo. opacity/transform são compositor-only (não repintam),
                    por isso o highlight de hover é uma camada separada que
                    anima só opacidade — visualmente idêntico, sem o bug.
                  */}
                  <div
                    ref={(el) => {
                      if (el) itemRefs.current.set(item.url, el);
                      else itemRefs.current.delete(item.url);
                    }}
                    className={cn(
                      "group relative isolate z-10 px-4 h-full flex items-center gap-2 text-sm font-medium rounded-full transform-gpu will-change-transform"
                    )}
                  >
                    {!isActive && (
                      <span className="absolute inset-0 -z-10 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    )}
                    <span className={cn(
                      "relative z-10 hidden lg:inline",
                      isActive ? "lqg-text text-white" : "text-white/40"
                    )}>
                      {item.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center ml-4 pl-4 border-l border-white/5">
            <button
              onClick={() => logout()}
              className="p-2.5 text-white/40 hover:text-red-500 transition-all duration-300"
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
