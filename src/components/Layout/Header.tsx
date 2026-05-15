import React, { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, Filter, FileText, DollarSign, MessageSquare, Users, Zap, LogOut, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, signOut } = useAuth();
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

  // Mostrar o header se o mouse estiver no topo da tela
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 50) {
        setIsMouseAtTop(true);
      } else {
        setIsMouseAtTop(false);
      }
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
        className="w-full px-6 py-4 flex justify-center fixed top-0 left-0 right-0 z-[60] pointer-events-none"
      >
        <header className="liquid-glass h-16 w-full max-w-7xl flex items-center px-6 gap-4 pointer-events-auto">

          {/* Logo Section */}
          <div className="flex items-center gap-2 mr-4 pr-4 border-r border-white/5">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/logo.png" alt="Porceli" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white hidden sm:inline">Porceli</span>
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
                  <div className={`
                    px-4 h-full flex items-center gap-2 text-sm font-medium transition-all duration-300 rounded-full
                    ${isActive 
                      ? "bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                      : "text-white/40 hover:text-white hover:bg-white/5"
                    }
                  `}>
                    <Icon className="w-4 h-4" style={isActive ? { color: '#6829c0' } : undefined} />
                    <span className="hidden lg:inline">{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center ml-4 pl-4 border-l border-white/5">
            <button
              onClick={() => signOut()}
              className="p-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group"
              title="Sair"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>
      </motion.div>
    </AnimatePresence>
  );
};
