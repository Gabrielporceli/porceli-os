import { StatsCard } from "@/components/Dashboard/StatsCard";
import { DollarCircle } from 'iconsax-react';

interface FinancialKPIsProps {
  previsaoMes: number;
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
}

export function FinancialKPIs({ previsaoMes, receitasMes, despesasMes, lucroMes }: FinancialKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatsCard
        title="Previsão do Mês"
        value={`R$ ${previsaoMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        className="[animation-delay:100ms]"
      />
      <StatsCard
        title="Faturamento do Mês"
        value={`R$ ${receitasMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        className="[animation-delay:200ms]"
      />
      <StatsCard
        title="Despesas do Mês"
        value={`R$ ${despesasMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        className="[animation-delay:300ms]"
      />
      <StatsCard
        title="Lucro do Mês"
        value={`R$ ${lucroMes.toLocaleString('pt-BR')}`}
        icon={DollarCircle}
        className="[animation-delay:400ms]"
        valueClassName={lucroMes >= 0 ? "text-green-400" : "text-red-400"}
      />
    </div>
  );
}
