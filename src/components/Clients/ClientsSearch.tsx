
import { Input } from "@/components/ui/input";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

interface ClientsSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFiltersOpen: () => void;
  onNewClient: () => void;
}

export function ClientsSearch({ searchTerm, onSearchChange, onFiltersOpen, onNewClient }: ClientsSearchProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar clientes..."
          className="pl-10 bg-white/[0.03] border-white/5 text-white placeholder:text-white/40 h-11 rounded-xl transition-all"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <LiquidGlassButton
            onClick={onFiltersOpen}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </LiquidGlassButton>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <LiquidGlassButton
            tint="primary"
            onClick={onNewClient}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            Novo Cliente
          </LiquidGlassButton>
        </motion.div>
      </div>
    </div>
  );
}
