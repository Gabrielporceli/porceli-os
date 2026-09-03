
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Building2 } from "lucide-react";

interface Client {
  id: string;
  company: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email: string;
  contractEnd: string;
  paymentDay: number;
  tags: string[];
  address: string;
  plan?: string;
  startDate?: string;
}

interface ClientsKPIsProps {
  clients: Client[];
}

export function ClientsKPIs({ clients }: ClientsKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatsCard
        title="Total de Clientes"
        value={clients.length}
        icon={Building2}
        className="[animation-delay:100ms]"
      />
      <StatsCard
        title="Clientes Ativos"
        value={clients.filter(c => c.tags.includes("Ativo")).length}
        icon={Building2}
        className="[animation-delay:200ms]"
      />
      <StatsCard
        title="Contratos A Vencer"
        value={clients.filter(c => c.tags.includes("A vencer")).length}
        icon={Building2}
        className="[animation-delay:300ms]"
      />
      <StatsCard
        title="Clientes Inativos"
        value={clients.filter(c => c.tags.includes("Inativo") || c.tags.includes("Vencido")).length}
        icon={Building2}
        className="[animation-delay:400ms]"
      />
    </div>
  );
}
