'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/area-charts-2';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Eye, ShoppingCart, Store, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

type FinancialEntry = {
  amount?: number | string;
  due_date?: string;
  status?: "paid" | "pending" | string;
};

type RevenueYoYChartProps = {
  financialEntries: FinancialEntry[];
  maxYearsToShow?: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0
  );

const parseLocalDate = (dateString: string) => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Helper para calcular KPIs do faturamento ano a ano
export const calculateRevenueKPIs = (financialEntries: FinancialEntry[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();

  // ✅ Base do faturamento: TODOS os lançamentos (paid + pending, incluindo vencidos)
  const validEntries = (financialEntries || []).filter((e) => {
    if (!e?.due_date || typeof e?.due_date !== "string" || !e.due_date.includes("-")) {
      return false;
    }

    // Inclui todos: paid e pending (incluindo vencidos)
    return e?.status === "paid" || e?.status === "pending";
  });

  const paidEntries = validEntries.filter((e) => e?.status === "paid");
  // Para KPIs, ainda filtra apenas pendentes não vencidos
  const pendingNotOverdueEntries = (financialEntries || []).filter((e) => {
    if (!e?.due_date || typeof e?.due_date !== "string" || !e.due_date.includes("-")) {
      return false;
    }
    if (e?.status !== "pending") return false;
    try {
      const dueDate = parseLocalDate(e.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today; // só pendentes não vencidos
    } catch {
      return false;
    }
  });

  // Agrupa por ano/mês
  const byYearMonth = new Map<number, number[]>();

  for (const e of validEntries) {
    try {
      const d = parseLocalDate(String(e.due_date));
      if (isNaN(d.getTime())) continue;

      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const amount = Number(e.amount) || 0;

      if (!byYearMonth.has(year)) byYearMonth.set(year, Array(12).fill(0));
      byYearMonth.get(year)![monthIdx] += amount;
    } catch {
      // ignore
    }
  }

  const yearTotal = (year: number) =>
    (byYearMonth.get(year) || Array(12).fill(0)).reduce((a, b) => a + (Number(b) || 0), 0);

  const totalCurrent = yearTotal(currentYear);
  const prevYear = currentYear - 1;
  const totalPrev = byYearMonth.has(prevYear) ? yearTotal(prevYear) : null;

  const yoyPct =
    totalPrev && totalPrev > 0 ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 100) : null;

  const totalPaidCurrentYear = paidEntries.reduce((sum, e) => {
    try {
      const d = parseLocalDate(String(e.due_date));
      if (d.getFullYear() === currentYear) return sum + (Number(e.amount) || 0);
    } catch { }
    return sum;
  }, 0);

  const totalPendingNotOverdueCurrentYear = pendingNotOverdueEntries.reduce((sum, e) => {
    try {
      const d = parseLocalDate(String(e.due_date));
      if (d.getFullYear() === currentYear) return sum + (Number(e.amount) || 0);
    } catch { }
    return sum;
  }, 0);

  return {
    totalCurrent,
    totalPaidCurrentYear,
    totalPendingNotOverdueCurrentYear,
    yoyPct,
    currentYear,
    prevYear,
  };
};

export function RevenueYoYChart({
  financialEntries,
  maxYearsToShow = 4,
}: RevenueYoYChartProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Data processing
  const validEntries = (financialEntries || []).filter((e) => {
    return (e?.due_date && (e?.status === "paid" || e?.status === "pending"));
  });

  const byYearMonth = new Map<number, number[]>();
  const yearsSet = new Set<number>();

  for (const e of validEntries) {
    try {
      const d = parseLocalDate(String(e.due_date));
      if (isNaN(d.getTime())) continue;
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const amount = Number(e.amount) || 0;
      yearsSet.add(year);
      if (!byYearMonth.has(year)) byYearMonth.set(year, Array(12).fill(0));
      byYearMonth.get(year)![monthIdx] += amount;
    } catch {}
  }

  yearsSet.add(currentYear);
  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const yearsToShow = years.slice(-maxYearsToShow);

  const months = Array.from({ length: 12 }).map((_, i) => {
    const name = new Date(2020, i, 1)
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  const chartData = months.map((monthName, idx) => {
    const row: Record<string, any> = { period: monthName };
    for (const y of yearsToShow) {
      const arr = byYearMonth.get(y) || Array(12).fill(0);
      row[String(y)] = arr[idx] || 0;
    }
    return row;
  });

  // Config for years
  const chartConfig: ChartConfig = {};
  const yearColors = [
    'var(--color-indigo-400)',
    'var(--color-indigo-500)',
    'var(--color-indigo-600)',
    'var(--color-indigo-700)',
  ];
  
  // Custom colors for Porceli theme (purples)
  const porceliColors = [
    '#4B5563', // Older (Gray)
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#D8B4FE', // Light Purple
  ];

  yearsToShow.forEach((y, i) => {
    chartConfig[String(y)] = {
      label: `Ano ${y}`,
      color: porceliColors[Math.min(i, porceliColors.length - 1)],
    };
  });

  // Stats for the header (Current Year totals vs Prev Year)
  const getYearTotal = (y: number) => (byYearMonth.get(y) || Array(12).fill(0)).reduce((a, b) => a + b, 0);
  
  const currentTotal = getYearTotal(currentYear);
  const prevYearTotal = getYearTotal(currentYear - 1);
  const yoyGrowth = prevYearTotal > 0 ? ((currentTotal - prevYearTotal) / prevYearTotal) * 100 : 0;

  return (
    <Card className="liquid-glass border-white/[0.05] dashboard-glow w-full">
      <CardHeader className="border-0 min-h-auto py-6">
        <CardTitle className="text-lg font-semibold text-white">Crescimento de Receita (YoY)</CardTitle>
      </CardHeader>

      <CardContent className="px-2.5">
        <div className="@container px-2.5">
          <div className="flex flex-wrap gap-10 mb-10">
            {yearsToShow.map((y, i) => {
              const yearTotal = getYearTotal(y);
              const isCurrent = y === currentYear;
              const color = chartConfig[String(y)].color;

              return (
                <div key={y} className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-0.5 h-12 rounded-full" 
                      style={{ backgroundColor: color || 'var(--color-indigo-500)' }}
                    ></div>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-white/40">Total {y}</div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-semibold leading-none text-white">
                          {formatCurrency(yearTotal)}
                        </span>
                        {isCurrent && (
                          <span className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            yoyGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {yoyGrowth >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                            {Math.abs(Math.round(yoyGrowth))}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ChartContainer
          config={chartConfig}
          className="h-[400px] w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, bottom: 10, left: 20, right: 20 }}
          >
            <defs>
              <pattern id="modernPattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M0,16 L32,16 M16,0 L16,32" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeOpacity="0.05" />
                <circle cx="8" cy="8" r="1.5" fill="white" fillOpacity="0.02" />
              </pattern>
              
              {yearsToShow.map((y) => (
                <linearGradient key={`fill-${y}`} id={`fill-${y}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig[String(y)].color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={chartConfig[String(y)].color} stopOpacity={0.1} />
                </linearGradient>
              ))}
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
                          <div key={p.dataKey} className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                              <span className="text-xs font-medium text-white/40">Ano {p.dataKey}</span>
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

            {yearsToShow.map((y, i) => (
              <Area
                key={y}
                dataKey={String(y)}
                type="natural"
                fill={`url(#fill-${y})`}
                fillOpacity={0.4}
                stroke={chartConfig[String(y)].color}
                stackId={i === yearsToShow.length - 1 ? undefined : "a"} // Last year is primary, others stacked? 
                // Actually user example stacked them. I'll stack them all for consistent look.
                dot={false}
                activeDot={{
                  r: 4,
                  fill: chartConfig[String(y)].color,
                  stroke: 'white',
                  strokeWidth: 1.5,
                }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
