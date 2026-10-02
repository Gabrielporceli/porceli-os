import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { FunnelCard } from "@/components/Dashboard/FunnelCard";
import { MiniSparklineCard } from "@/components/Dashboard/MiniSparklineCard";
import {
  Calendar,
  DollarCircle,
  Profile2User,
  TrendUp,
} from "iconsax-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { useDashboardData } from "@/hooks/useDashboardData";
import { RevenueYoYChart } from "@/components/Dashboard/RevenueYoYChart";
import { AnimatedValue } from "@/components/ui/AnimatedValue";

export default function Dashboard() {
  const isReady = usePageReady();
  const d = useDashboardData();

  if (!isReady) return <PageLoader />;

  const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  const tom = (v: number | null) => (v === null ? undefined : v >= 0 ? ("up" as const) : ("down" as const));
  const corTom = (t?: "up" | "down", claro = false) =>
    t === "up"
      ? claro ? "text-green-600" : "text-green-400"
      : t === "down"
        ? claro ? "text-red-600" : "text-red-400"
        : claro ? "text-[#2F2D2E]" : "text-white";

  // Card de lista: várias métricas parecidas num bloco só, uma por linha
  // (rótulo à esquerda, número à direita). É o que quebra a grade de
  // quadradinhos iguais — em vez de 5 cards 1×1, um card 2×2.
  const Lista = ({
    titulo,
    linhas,
    className,
    claro = false,
  }: {
    titulo: string;
    linhas: { label: string; value: string; tone?: "up" | "down" }[];
    className?: string;
    claro?: boolean;
  }) => (
    <Card className={`${claro ? "surface-light" : "surface-flat"} flex h-full flex-col p-5 ${className ?? ""}`}>
      <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${claro ? "text-[#2F2D2E]/50" : "text-white/40"}`}>{titulo}</p>
      <div className={`flex flex-1 flex-col justify-between divide-y ${claro ? "divide-black/[0.08]" : "divide-white/[0.06]"}`}>
        {linhas.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className={`text-xs ${claro ? "text-[#2F2D2E]/60" : "text-white/55"}`}>{l.label}</span>
            <span className={`text-base font-black tabular-nums tracking-tight ${corTom(l.tone, claro)}`}>
              <AnimatedValue value={l.value} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );

  const stat = "text-xl text-white 2xl:text-2xl";

  return (
    /*
      BENTO GRID DESCONSTRUÍDA — 6 colunas a partir de xl (4 no md), linhas
      de no mínimo 150px. O que importa é a MISTURA de formatos: poucos
      quadradinhos 1×1, blocos largos 2×1, cards de lista 2×2, o funil 2×3 e
      o gráfico 4×4. No xl cada bloco tem posição fixa (col/row-start) pra o
      desenho não depender da ordem do código; abaixo disso a grade flui
      (`grid-flow-row-dense`) e os spans só valem a partir de `sm` — num grid
      de 1 coluna, `col-span-2` criaria uma coluna implícita.

      Mapa no xl (colunas 1-6):
        linha 1   [ Faturamento ][MRR][ARR][   Funil    ]
        linha 2   [    O ano    ][Cli][Vcr][   Funil    ]
        linha 3   [    O ano    ][Recebíveis][   Funil    ]
        linha 4-5 [      Gráfico 4×4       ][  Saúde 2×2 ]
        linha 6   [                        ][Comparativo]
        linha 7   [                        ][Churn][Conc]
    */
    <div className="grid animate-fade-in grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5 md:auto-rows-[minmax(150px,auto)] xl:grid-cols-6">
      {/* Faturamento previsto do mês — tudo que vence no mês (pago +
          pendente), destaque em cor chapada, 2×1. Lucro e margem saem da
          MESMA base, senão um usa o recebido e o outro o previsto. */}
      <Card className="surface-accent flex h-full flex-col justify-between p-5 sm:col-span-2 xl:col-start-1 xl:row-start-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Faturamento previsto</p>
        <p className="text-3xl font-black tracking-tighter text-white">
          <AnimatedValue value={d.formatCurrency(d.faturamentoGeralMesAtual)} />
        </p>
        <div className="flex gap-5 text-xs text-white/60">
          <span>Lucro <b className="text-white">{d.formatCurrency(d.lucroLiquido)}</b></span>
          <span>Margem <b className="text-white">{d.margemLucro.toFixed(1)}%</b></span>
        </div>
      </Card>

      {/* Números principais — 1×1, borda curvada + círculo de vidro. */}
      <StatsCard title="MRR (Mensal)" value={d.formatCurrency(d.monthlyRevenue)} icon={DollarCircle} description="Mensalidades valendo hoje" valueClassName={stat} className="h-full xl:col-start-3 xl:row-start-1" />
      <StatsCard title="Previsão 12 meses" value={d.formatCurrency(d.receitaPrevista12m)} icon={TrendUp} description={`${d.formatCurrency(d.receitaContratada12m)} já contratado`} valueClassName={stat} className="h-full xl:col-start-4 xl:row-start-1" />
      <StatsCard title="Clientes Ativos" value={d.activeClients.toString()} icon={Profile2User} description="Com mensalidade vigente" valueClassName={stat} className="h-full xl:col-start-3 xl:row-start-2" />
      <StatsCard title="Contratos a vencer" value={d.expiringIn30Days.toString()} icon={Calendar} description="30 dias, sem renovação" valueClassName={stat} className="h-full xl:col-start-4 xl:row-start-2" />

      {/* Funil — bloco alto, 2×3. */}
      <FunnelCard etapas={d.funnelStages} className="h-full sm:col-span-2 md:row-span-3 xl:col-start-5 xl:row-start-1" />

      {/* O ano — lista 2×2. */}
      <Lista
        titulo={`O ano de ${d.revenueKPIs.currentYear}`}
        className="sm:col-span-2 md:row-span-2 xl:col-start-1 xl:row-start-2"
        linhas={[
          { label: "Total faturado", value: d.formatCurrency(d.revenueKPIs.totalCurrent) },
          { label: "Recebido", value: d.formatCurrency(d.revenueKPIs.totalPaidCurrentYear) },
          { label: "A receber", value: d.formatCurrency(d.revenueKPIs.totalPendingNotOverdueCurrentYear) },
          {
            label: "Crescimento YoY",
            value: d.revenueKPIs.yoyPct === null ? "—" : `${d.revenueKPIs.yoyPct > 0 ? "+" : ""}${d.revenueKPIs.yoyPct}%`,
            tone: tom(d.revenueKPIs.yoyPct),
          },
          {
            label: "Mês vs ano anterior",
            value: d.variacaoMesAnoPassado === null ? "—" : pct(d.variacaoMesAnoPassado),
            tone: tom(d.variacaoMesAnoPassado),
          },
        ]}
      />

      {/* Recebíveis — 2×1, os dois lados do mesmo assunto num card só. */}
      <Card className="surface-light grid h-full grid-cols-2 divide-x divide-black/[0.08] p-5 sm:col-span-2 xl:col-start-3 xl:row-start-3">
        <div className="flex flex-col justify-between pr-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#2F2D2E]/50">A receber</p>
          <p className="text-xl font-black tracking-tight text-[#2F2D2E] 2xl:text-2xl">
            <AnimatedValue value={d.formatCurrency(d.aReceberMesAtual)} />
          </p>
          <p className="text-[10px] text-[#2F2D2E]/50">Este mês, no prazo</p>
        </div>
        <div className="flex flex-col justify-between pl-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#2F2D2E]/50">Vencidos</p>
          <p className={`text-xl font-black tracking-tight 2xl:text-2xl ${d.vencidos > 0 ? "text-red-600" : "text-[#2F2D2E]"}`}>
            <AnimatedValue value={d.formatCurrency(d.vencidos)} />
          </p>
          <p className="text-[10px] text-[#2F2D2E]/50">Qualquer mês</p>
        </div>
      </Card>

      {/* Gráfico — bloco grande, 4×4. */}
      <RevenueYoYChart
        financialEntries={d.financialEntries as any[]}
        className="h-full sm:col-span-2 md:col-span-4 xl:col-start-1 xl:row-start-4 xl:row-span-4"
      />

      {/* Saúde do negócio — lista 2×2. */}
      <Lista
        titulo="Saúde do negócio"
        claro
        className="sm:col-span-2 md:row-span-2 xl:col-start-5 xl:row-start-4"
        linhas={[
          { label: "LTV", value: d.formatCurrency(d.ltv) },
          { label: "Ticket médio", value: d.formatCurrency(d.ticketMedioContratosAtivos) },
          { label: "Margem de lucro", value: `${d.margemLucro.toFixed(1)}%` },
          { label: "Receita por hora", value: d.formatCurrency(d.receitaPorHora) },
        ]}
      />

      {/* Comparativo — 2×1 com a curva dos últimos meses. */}
      <MiniSparklineCard
        flat
        title="Comparativo mensal"
        value={pct(d.variacaoComparativoMensal)}
        trend={d.variacaoComparativoMensal >= 0 ? "up" : "down"}
        data={d.comparativoTrend}
        className="h-full sm:col-span-2 xl:col-start-5 xl:row-start-6"
      />

      {/* Dois quadradinhos pra fechar. */}
      <MiniSparklineCard
        flat
        title="Churn médio/mês"
        value={`${d.churnRate.toFixed(1)}%`}
        // Churn subindo é ruim: verde só se a curva caiu no período.
        trend={d.churnTrend[d.churnTrend.length - 1].value <= d.churnTrend[0].value ? "up" : "down"}
        data={d.churnTrend}
        className="h-full xl:col-start-5 xl:row-start-7"
      />
      <MiniSparklineCard
        flat
        title="Concentração"
        value={`${d.concentracaoReceita.toFixed(1)}%`}
        trend={d.concentracaoReceita <= 30 ? "up" : "down"}
        color={d.concentracaoReceita <= 30 ? "#22c55e" : "#ef4444"}
        data={d.concentracaoTrend}
        className="h-full xl:col-start-6 xl:row-start-7"
      />
    </div>
  );
}
