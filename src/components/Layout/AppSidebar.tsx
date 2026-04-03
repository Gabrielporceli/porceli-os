import { useState } from "react";
import { BarChart2, Filter, FileText, DollarSign, MessageSquare, Users, LogOut, Bot, Calendar } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart2 },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Financeiro", url: "/financial", icon: DollarSign },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Agente SDR", url: "/sdr-agent", icon: Bot },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Zona de hover na borda esquerda */}
      <div
        className="fixed inset-y-0 left-0 w-3 z-40"
        onMouseEnter={() => setOpen(true)}
      />

      {/* Barra flutuante */}
      <div
        className={`
          fixed left-4 top-4 bottom-4 z-50
          flex flex-col items-center
          liquid-glass rounded-[2rem]
          px-2 py-8
          transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          ${open ? "translate-x-0 opacity-100" : "-translate-x-[150%] opacity-0"}
        `}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >

        {/* Ícones no topo */}
        <div className="flex flex-col items-center gap-4 w-full px-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                to={item.url}
                title={item.title}
                className={`
                  relative group
                  flex items-center justify-center
                  w-12 h-12 rounded-2xl
                  transition-all duration-300
                  ${isActive
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(104,41,192,0.4)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
              </Link>
            );
          })}
        </div>

        {/* Espaço flexível que empurra o botão para baixo */}
        <div className="flex-1" />

        {/* Botão de sair no rodapé da barra */}
        <button
          type="button"
          title="Sair"
          onClick={handleLogout}
          className="
            flex items-center justify-center
            w-12 h-12 rounded-2xl
            text-white/40 hover:text-red-400 hover:bg-red-400/10
            transition-all duration-300
          "
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
