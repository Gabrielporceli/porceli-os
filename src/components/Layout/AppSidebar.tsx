import { BarChart2, Filter, FileText, DollarSign, MessageSquare, Users, LogOut, Calendar, Zap, LayoutGrid, ChevronRight, Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Financeiro", url: "/financial", icon: DollarSign },

  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Automações",  url: "/automations",        icon: Zap   },
  { title: "Agendamentos", url: "/scheduled-messages", icon: Clock },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 h-screen flex flex-col sidebar-glass border-r border-white/5 relative z-50">
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-glow-cyan">
          <div className="w-6 h-6 border-2 border-black rounded-md rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-black rounded-full" />
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Porceli</span>
      </div>


      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;

          return (
            <Link key={item.title} to={item.url}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? "active-item-pill" 
                    : "hover:bg-white/5"
                  }
                `}
              >
                {/* Icon Container */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isActive 
                    ? "icon-glow-cyan" 
                    : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                  }
                `}>

                  <Icon className="w-5 h-5" />
                </div>

                {/* Title */}
                <span className={`
                  font-medium transition-colors duration-300
                  ${isActive ? "text-white" : "text-white/40 group-hover:text-white"}
                `}>
                  {item.title}
                </span>

                {/* Active Indicator Arrow */}
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="ml-auto"
                  >
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </motion.div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="p-6 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-400/20">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
