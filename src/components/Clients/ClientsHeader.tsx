
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ClientsHeaderProps {
  onNewClient: () => void;
}

export function ClientsHeader({ onNewClient }: ClientsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-white tracking-tight">Clientes</h1>

      </div>
      <Button
        className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all"
        onClick={onNewClient}
      >
        <Plus className="w-4 h-4 mr-2" />
        Novo Cliente
      </Button>
    </div>
  );
}
