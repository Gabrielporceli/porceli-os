import React, { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, Filter, FileText, DollarSign, MessageSquare, Users, Zap, LogOut, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
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
          <nav className="flex items-center justify-center gap-1 flex-1 h-full overflow-x-auto scrollbar-hide">
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
                  <div className={cn(
                    "group relative isolate px-4 h-full flex items-center gap-2 text-sm font-medium rounded-full transform-gpu will-change-transform"
                  )}>
                    {!isActive && (
                      <span className="absolute inset-0 -z-10 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    )}
                    {/* Pílula de vidro compartilhada: desliza até a página ativa */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="lqg-lens lqg-lens--nav absolute inset-0 -z-10 rounded-full pointer-events-none"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
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
              className="p-2.5 text-white/30 hover:text-red-500 transition-all duration-300"
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
