
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Building } from 'iconsax-react';
import { useIsMobile } from "@/hooks/use-mobile";

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
  // Celular: 2×2 em vez de 4 cards empilhados, com títulos curtos pra caber
  // nos ~166px de cada um.
  const curto = useIsMobile();
  const valor = "text-2xl text-white md:text-3xl";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
      <StatsCard
        title={curto ? "Total" : "Total de Clientes"}
        value={clients.length}
        icon={Building}
        valueClassName={valor}
        className="[animation-delay:100ms]"
      />
      <StatsCard
        title={curto ? "Ativos" : "Clientes Ativos"}
        value={clients.filter(c => c.tags.includes("Ativo")).length}
        icon={Building}
        valueClassName={valor}
        className="[animation-delay:200ms]"
      />
      <StatsCard
        title={curto ? "A vencer" : "Contratos A Vencer"}
        value={clients.filter(c => c.tags.includes("A vencer")).length}
        icon={Building}
        valueClassName={valor}
        className="[animation-delay:300ms]"
      />
      <StatsCard
        title={curto ? "Inativos" : "Clientes Inativos"}
        value={clients.filter(c => c.tags.includes("Inativo") || c.tags.includes("Vencido")).length}
        icon={Building}
        valueClassName={valor}
        className="[animation-delay:400ms]"
      />
    </div>
  );
}
