
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface ConversationsSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFiltersOpen: () => void;
}

export function ConversationsSearch({ searchTerm, onSearchChange, onFiltersOpen }: ConversationsSearchProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-goat-gray-400" />
        <Input
          placeholder="Buscar conversas..."
          className="pl-10 bg-goat-gray-800 border-goat-gray-600 text-white placeholder:text-goat-gray-400"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Button 
        className="btn-primary flex items-center gap-2"
        onClick={onFiltersOpen}
      >
        <Filter className="w-4 h-4" />
        Filtros
      </Button>
    </div>
  );
}
