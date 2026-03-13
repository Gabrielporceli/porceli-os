"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Definindo a interface para os dados dos contratos que o gráfico recebe
interface ContractProjection {
  clientName: string;
  monthlyValue: number;
  durationInMonths: number; // Changed from 'duration' to match the actual data structure
  startMonth: string; // formato "YYYY-MM"
}

interface ProjectionChartProps {
  contracts: ContractProjection[];
  activeContractsCount?: number; // Número real de contratos ativos (calculado externamente)
}

// Função para formatar o valor como moeda brasileira
const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ProjectionChart({ contracts = [], activeContractsCount }: ProjectionChartProps) {
  // --- LÓGICA DE PROCESSAMENTO DOS DADOS ---
  const processChartData = () => {
    try {
      const monthlyProjections: { [key: string]: number } = {};
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // getMonth() é 0-11

      console.log(`[CHART DEBUG] Hoje: ${today.toISOString().split('T')[0]}, Processando ${contracts.length} contratos`);

      // Validação dos contratos
      const validContracts = contracts.filter(contract =>
        contract &&
        typeof contract.monthlyValue === 'number' &&
        typeof contract.durationInMonths === 'number' &&
        typeof contract.startMonth === 'string' &&
        contract.startMonth.includes('-')
      );

      console.log(`[CHART DEBUG] Contratos válidos: ${validContracts.length}`);

      // Para cada contrato, adiciona seu valor mensal aos meses de sua duração
      validContracts.forEach(contract => {
        try {
          const [startYear, startMonthNum] = contract.startMonth.split('-').map(Number);

          // Validação dos valores extraídos
          if (isNaN(startYear) || isNaN(startMonthNum)) return;

          console.log(`[CHART DEBUG] ${contract.clientName}: ${contract.durationInMonths} meses a partir de ${contract.startMonth}, R$ ${contract.monthlyValue}/mês`);

          for (let i = 0; i < contract.durationInMonths; i++) {
            let monthDate = new Date(startYear, startMonthNum - 1 + i, 1);

            // Consideramos apenas projeções dentro do ano atual
            if (monthDate.getFullYear() === currentYear) {
              const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
              if (!monthlyProjections[monthKey]) {
                monthlyProjections[monthKey] = 0;
              }
              monthlyProjections[monthKey] += contract.monthlyValue;
              console.log(`[CHART DEBUG]   - Mês ${monthKey}: +R$ ${contract.monthlyValue} = R$ ${monthlyProjections[monthKey]}`);
            }
          }
        } catch (error) {
          console.error('Erro ao processar contrato:', contract, error);
        }
      });

      console.log('[CHART DEBUG] Projeções mensais:', monthlyProjections);

      // Pega os 12 meses do ano atual para exibir no gráfico
      const chartData = [];
      for (let i = 0; i < 12; i++) {
        let date = new Date(currentYear, i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${String(month).padStart(2, '0')}`;

        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        chartData.push({
          name: capitalizedMonth, // Jan, Fev, Mar...
          Projeção: monthlyProjections[key] || 0,
        });
      }

      return chartData;
    } catch (error) {
      console.error('Erro ao processar dados do gráfico:', error);
      return [];
    }
  };

  const data = processChartData();
  const totalProjection = data.reduce((sum, item) => sum + (item.Projeção || 0), 0);
  const monthlyAverage = data.length > 0 ? totalProjection / data.length : 0;

  // Usa o número real de contratos ativos se fornecido, caso contrário calcula baseado nos contratos filtrados
  const activeContractsNow = activeContractsCount !== undefined ? activeContractsCount : contracts.filter(c => {
    try {
      if (!c || !c.startMonth || typeof c.durationInMonths !== 'number') return false;

      const [startYear, startMonth] = c.startMonth.split('-').map(Number);
      if (isNaN(startYear) || isNaN(startMonth)) return false;

      const today = new Date();
      const startDate = new Date(startYear, startMonth - 1, 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + c.durationInMonths);

      return today >= startDate && today < endDate;
    } catch (error) {
      console.error('Erro ao verificar contrato ativo:', c, error);
      return false;
    }
  }).length;

  // --- FIM DA LÓGICA ---

  const currentYear = new Date().getFullYear();

  return (
    <Card className="liquid-glass dashboard-glow border-white/5 p-8 animate-premium-in">
      <h3 className="text-xl font-bold text-white tracking-tight mb-6">Projeção de Faturamento Anual</h3>

      {/* KPIs do Gráfico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 overflow-hidden">
        <div className="liquid-glass p-5 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Faturamento Anual ({currentYear})</p>
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{formatCurrency(totalProjection)}</p>
        </div>
        <div className="liquid-glass p-5 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Média Mensal</p>
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{formatCurrency(monthlyAverage)}</p>
        </div>
        <div className="liquid-glass p-5 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Contratos Ativos</p>
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{activeContractsNow}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="w-full h-[400px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="rgba(255, 255, 255, 0.2)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={15}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.2)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${Number(value) / 1000}k`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(23, 23, 23, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '1rem',
                  borderWidth: '1px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
              />
              <Area
                type="monotone"
                dataKey="Projeção"
                stroke="#8B5CF6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorProjection)"
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center opacity-20">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <p className="text-white/20 text-sm font-medium">Nenhum dado disponível para exibir</p>
          </div>
        )}
      </div>
    </Card>
  );
}
