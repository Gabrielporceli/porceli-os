import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialKPIsProps {
  totalReceitas: number;
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
}

export function FinancialKPIs({ totalReceitas, receitasMes, despesasMes, lucroMes }: FinancialKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:100ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Faturamento Geral</p>
          <p className="text-2xl font-black text-white tracking-tighter">
            R$ {totalReceitas.toLocaleString('pt-BR')}
          </p>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:200ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Faturamento do Mês</p>
          <p className="text-2xl font-black text-white tracking-tighter">
            R$ {receitasMes.toLocaleString('pt-BR')}
          </p>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:300ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Despesas do Mês</p>
          <p className="text-2xl font-black text-white tracking-tighter">
            R$ {despesasMes.toLocaleString('pt-BR')}
          </p>
        </div>
      </Card>

      <Card className="liquid-glass dashboard-glow border-white/5 p-6 animate-premium-in [animation-delay:400ms] overflow-hidden group hover:bg-white/[0.04] transition-all">
        <div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Lucro do Mês</p>
          <p className={cn(
            "text-2xl font-black tracking-tighter",
            lucroMes >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            R$ {lucroMes.toLocaleString('pt-BR')}
          </p>
        </div>
      </Card>
    </div>
  );
}
