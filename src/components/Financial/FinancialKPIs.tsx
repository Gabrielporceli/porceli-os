import { StatsCard } from "@/components/Dashboard/StatsCard";
import { DollarCircle } from 'iconsax-react';
import { useIsMobile } from "@/hooks/use-mobile";

interface FinancialKPIsProps {
  previsaoMes: number;
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
}

export function FinancialKPIs({ previsaoMes, receitasMes, despesasMes, lucroMes }: FinancialKPIsProps) {
  // Celular: 2 colunas (eram 4 cards de ~150px empilhados, uma tela inteira
  // só de números) e título/valor menores pra caberem nos ~166px de cada um.
  const curto = useIsMobile();
  const valor = "text-xl text-white md:text-3xl";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
      <StatsCard
        title={curto ? "Previsão" : "Previsão do Mês"}
        value={`R$ ${previsaoMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        valueClassName={valor}
        className="[animation-delay:100ms]"
      />
      <StatsCard
        title={curto ? "Faturado" : "Faturamento do Mês"}
        value={`R$ ${receitasMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        valueClassName={valor}
        className="[animation-delay:200ms]"
      />
      <StatsCard
        title={curto ? "Despesas" : "Despesas do Mês"}
        value={`R$ ${despesasMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        valueClassName={valor}
        className="[animation-delay:300ms]"
      />
      <StatsCard
        title={curto ? "Lucro" : "Lucro do Mês"}
        value={`R$ ${lucroMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        className="[animation-delay:400ms]"
        valueClassName={`text-xl md:text-3xl ${lucroMes >= 0 ? "text-green-400" : "text-red-400"}`}
      />
    </div>
  );
}
