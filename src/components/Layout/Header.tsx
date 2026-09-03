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
                  className="h-10 flex items-center shrink-0"
                >
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
