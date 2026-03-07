
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface ClientsSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFiltersOpen: () => void;
}

export function ClientsSearch({ searchTerm, onSearchChange, onFiltersOpen }: ClientsSearchProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar clientes..."
          className="pl-10 bg-white/[0.03] border-white/5 text-white placeholder:text-white/40 focus:border-primary/50 focus:ring-primary/20 h-11 rounded-xl transition-all"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Button 
        className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 h-11 px-6 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all"
        onClick={onFiltersOpen}
      >
        <Filter className="w-4 h-4" />
        Filtros
      </Button>
    </div>
  );
}
