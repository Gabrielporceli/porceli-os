'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/area-charts-2";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface ContractProjection {
  clientName: string;
  monthlyValue: number;
  durationInMonths: number;
  startMonth: string;
}

interface ProjectionChartProps {
  contracts: ContractProjection[];
  activeContractsCount?: number;
  financialEntriesTotal2026?: number;
}

const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const chartConfig: ChartConfig = {
  Projeção: {
    label: 'Projeção',
    color: '#8B5CF6',
  },
};

export function ProjectionChart({ contracts = [], activeContractsCount, financialEntriesTotal2026 }: ProjectionChartProps) {
  const processChartData = () => {
    try {
      const monthlyProjections: { [key: string]: number } = {};
      const today = new Date();
      const currentYear = today.getFullYear();

      const validContracts = contracts.filter(contract =>
        contract &&
        typeof contract.monthlyValue === 'number' &&
        typeof contract.durationInMonths === 'number' &&
        typeof contract.startMonth === 'string' &&
        contract.startMonth.includes('-')
      );

      validContracts.forEach(contract => {
        try {
          const [startYear, startMonthNum] = contract.startMonth.split('-').map(Number);
          if (isNaN(startYear) || isNaN(startMonthNum)) return;

          for (let i = 0; i < contract.durationInMonths; i++) {
            const monthDate = new Date(startYear, startMonthNum - 1 + i, 1);
            if (monthDate.getFullYear() === currentYear) {
              const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
              monthlyProjections[monthKey] = (monthlyProjections[monthKey] || 0) + contract.monthlyValue;
            }
          }
        } catch {}
      });

      return Array.from({ length: 12 }).map((_, i) => {
        const date = new Date(currentYear, i, 1);
        const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        return {
          period: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          Projeção: monthlyProjections[key] || 0,
        };
      });
    } catch {
      return [];
    }
  };

  const data = processChartData();
  const chartTotal = data.reduce((sum, item) => sum + (item.Projeção || 0), 0);
  const totalProjection = financialEntriesTotal2026 !== undefined ? financialEntriesTotal2026 : chartTotal;
  const monthlyAverage = chartTotal / 12;

  const activeContractsNow = activeContractsCount !== undefined ? activeContractsCount : contracts.filter(c => {
    try {
      if (!c?.startMonth || typeof c.durationInMonths !== 'number') return false;
      const [startYear, startMonth] = c.startMonth.split('-').map(Number);
      if (isNaN(startYear) || isNaN(startMonth)) return false;
      const today = new Date();
      const startDate = new Date(startYear, startMonth - 1, 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + c.durationInMonths);
      return today >= startDate && today < endDate;
    } catch {
      return false;
    }
  }).length;

  const currentYear = new Date().getFullYear();

  const kpis = [
    { label: `Faturamento ${currentYear}`, value: formatCurrency(totalProjection), color: '#8B5CF6' },
    { label: 'Média Mensal', value: formatCurrency(monthlyAverage), color: '#6366F1' },
    { label: 'Contratos Ativos', value: String(activeContractsNow), color: '#D8B4FE' },
  ];

  return (
    <Card className="liquid-glass border-white/[0.05] dashboard-glow w-full">
      <CardHeader className="border-0 min-h-auto py-6">
        <CardTitle className="text-lg font-semibold text-white">Projeção de Faturamento Anual</CardTitle>
      </CardHeader>

      <CardContent className="px-2.5">
        <div className="@container px-2.5">
          <div className="flex flex-wrap gap-10 mb-10">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-0.5 h-12 rounded-full"
                    style={{ backgroundColor: kpi.color }}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-white/40">{kpi.label}</div>
                    <div className="text-2xl font-semibold leading-none text-white">{kpi.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="h-[400px] w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              <defs>
                <linearGradient id="fillProjeção" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ textAnchor: 'middle', fontSize: 12, fill: 'rgba(255,255,255,0.4)' }}
                interval={0}
              />

              <YAxis hide />

              <ChartTooltip
                cursor={{
                  strokeDasharray: '4 4',
                  stroke: 'rgba(255,255,255,0.2)',
                  strokeWidth: 1,
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-4 shadow-2xl min-w-[200px]">
                        <div className="text-sm font-semibold text-white mb-3.5 pb-2 border-b border-white/10">
                          {label}
                        </div>
                        <div className="space-y-1.5">
                          {payload.map((p) => (
                            <div key={String(p.dataKey)} className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                                <span className="text-xs font-medium text-white/40">Faturamento</span>
                              </div>
                              <span className="text-sm font-semibold text-white">{formatCurrency(p.value as number)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                dataKey="Projeção"
                type="natural"
                fill="url(#fillProjeção)"
                fillOpacity={0.4}
                stroke="#8B5CF6"
                dot={false}
                animationBegin={0}
                animationDuration={2000}
                animationEasing="ease-in-out"
                activeDot={{
                  r: 4,
                  fill: '#8B5CF6',
                  stroke: 'white',
                  strokeWidth: 1.5,
                }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center opacity-20">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <p className="text-white/20 text-sm font-medium">Nenhum dado disponível para exibir</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
