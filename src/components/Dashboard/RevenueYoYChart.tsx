import { Card } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FinancialEntry = {
  amount?: number | string;
  due_date?: string; // YYYY-MM-DD (ideal)
  status?: "paid" | "pending" | string;
};

type RevenueYoYChartProps = {
  title?: string;
  subtitle?: string;
  financialEntries: FinancialEntry[];
  maxYearsToShow?: number; // default 4
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0
  );

const formatAxisBRL = (value: number) => {
  const v = Number(value) || 0;
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(1)}k`;
  return `R$${v}`;
};

// YYYY-MM-DD (sem timezone)
export const parseLocalDate = (dateString: string) => {
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
  title = "Crescimento de Receita (YoY)",
  subtitle = "Comparação de receita total entre anos.",
  financialEntries,
  maxYearsToShow = 4,
}: RevenueYoYChartProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ Base do faturamento: TODOS os lançamentos (paid + pending, incluindo vencidos)
  const validEntries = (financialEntries || []).filter((e) => {
    if (!e?.due_date || typeof e?.due_date !== "string" || !e.due_date.includes("-")) {
      return false;
    }

    // Inclui todos: paid e pending (incluindo vencidos)
    return e?.status === "paid" || e?.status === "pending";
  });

  // Agrupa por ano/mês
  const byYearMonth = new Map<number, number[]>();
  const yearsSet = new Set<number>();

  for (const e of validEntries) {
    try {
      const d = parseLocalDate(String(e.due_date));
      if (isNaN(d.getTime())) continue;

      const year = d.getFullYear();
      const monthIdx = d.getMonth(); // 0..11
      const amount = Number(e.amount) || 0;

      yearsSet.add(year);
      if (!byYearMonth.has(year)) byYearMonth.set(year, Array(12).fill(0));
      byYearMonth.get(year)![monthIdx] += amount;
    } catch {
      // ignore
    }
  }

  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear); // garante linha do ano atual

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const yearsToShow = years.slice(-maxYearsToShow);

  const months = Array.from({ length: 12 }).map((_, i) => {
    const name = new Date(2020, i, 1)
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  const data = months.map((monthName, idx) => {
    const row: Record<string, any> = { month: monthName };
    for (const y of yearsToShow) {
      const arr = byYearMonth.get(y) || Array(12).fill(0);
      row[String(y)] = arr[idx] || 0;
    }
    return row;
  });

  // Estilo das linhas (cores distintas para facilitar a leitura)
  const lineStyleForIndex = (idxFromEnd: number, total: number) => {
    const isMostRecent = idxFromEnd === total - 1;

    // Cores: Roxo vibrante para o atual, Azul/Indigo para o anterior, Cinza para os mais antigos
    const colors = ["#4B5563", "#3B82F6", "#8B5CF6"];
    const color = colors[Math.min(idxFromEnd, colors.length - 1)];

    return {
      stroke: isMostRecent ? "#8B5CF6" : (idxFromEnd === total - 2 ? "#3B82F6" : "#4B5563"),
      strokeWidth: isMostRecent ? 3 : 2,
      strokeOpacity: isMostRecent ? 1 : 0.6,
      strokeDasharray: isMostRecent ? "0" : "5 5",
    };
  };
  return (
    <Card className="liquid-glass border-white/[0.05] p-6 dashboard-glow">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h3>
          <p className="text-white/30 text-xs mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 18, left: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

            <XAxis
              dataKey="month"
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisBRL}
              width={46}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10, 10, 10, 0.95)",
                backdropFilter: "blur(20px)",
                borderColor: "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
                borderRadius: "1rem",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)", fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}
              itemStyle={{ fontSize: "13px", color: "#fff", padding: "2px 0" }}
              formatter={(value: any, name: any) => [
                formatCurrency(Number(value) || 0),
                name,
              ]}
            />

            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.4)", fontSize: 10, paddingTop: 20 }}
              iconType="circle"
              iconSize={8}
            />

            {yearsToShow.map((y, i) => {
              const style = lineStyleForIndex(i, yearsToShow.length);
              const isCurrent = y === currentYear;
              return (
                <Line
                  key={y}
                  type="monotone"
                  dataKey={String(y)}
                  name={isCurrent ? `Ano Atual (${y})` : `Ano (${y})`}
                  dot={false}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeOpacity={style.strokeOpacity}
                  strokeDasharray={style.strokeDasharray}
                  animationDuration={1500}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
