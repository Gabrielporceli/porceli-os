import { StatsCard } from "@/components/Dashboard/StatsCard";
import { AlertCard, type Alert } from "@/components/Dashboard/AlertCard";
import { Card } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Component as EtherealShadow } from "@/components/ui/etheral-shadow";

import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useStages } from "@/hooks/useStages";
import { useLeads } from "@/hooks/useLeads";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useExpenses } from "@/hooks/useExpenses";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RevenueYoYChart, calculateRevenueKPIs } from "@/components/Dashboard/RevenueYoYChart";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: contracts = [] } = useContracts();
  const { stages = [] } = useStages();
  const { leads = [] } = useLeads();
  const { financialEntries = [] } = useFinancialEntries();
  const { expenses = [] } = useExpenses();

  // ===== Helpers =====
  const parseLocalDate = (dateString: string) => {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      Number.isFinite(value) ? value : 0
    );

  const norm = (s: string) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const safeParseDate = (dateString?: string) => {
    if (!dateString) return null;

    if (dateString.includes("T")) {
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? null : d;
    }

    const parts = dateString.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      return isNaN(dt.getTime()) ? null : dt;
    }

    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  };

  // ===== Métricas topo =====
  const activeContracts = contracts.filter((c: any) => c?.status === "active");
  const monthlyRevenue = activeContracts.reduce(
    (total: number, c: any) => total + (Number(c?.monthly_value) || 0),
    0
  );
  const arr = monthlyRevenue * 12;

  const activeClients = clients.filter((client: any) =>
    (client?.tags || []).includes("Ativo")
  ).length;

  // Ticket médio dos contratos ativos
  const ticketMedioContratosAtivos =
    activeContracts.length > 0 ? monthlyRevenue / activeContracts.length : 0;

  // Cálculo do Churn (taxa de cancelamento)
  // Clientes perdidos = clientes inativos/vencidos
  const lostClients = clients.filter((client: any) => {
    const tags = client?.tags || [];
    return tags.includes("Inativo") || tags.includes("Vencido");
  }).length;

  // Total de clientes no início = clientes ativos + clientes perdidos
  const totalClientsInitial = activeClients + lostClients;

  // Churn = (Clientes Perdidos / Total de Clientes Iniciais) * 100
  const churnRate =
    totalClientsInitial > 0 ? (lostClients / totalClientsInitial) * 100 : 0;

  // Contratos a vencer (30 dias)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const expiringIn30Days = contracts.filter((c: any) => {
    if (!c) return false;
    if (c.status === "expiring") return true;

    const end = safeParseDate(c.end_date);
    if (!end) return false;

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const limit = new Date(in30);
    limit.setHours(23, 59, 59, 999);

    return endDay >= today && endDay <= limit;
  }).length;

  // ===== KPIs Saúde Financeira =====
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const receitasMes = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "paid") return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  const despesasMes = (expenses || []).reduce((sum: number, expense: any) => {
    if (!expense?.date) return sum;
    try {
      const d = parseLocalDate(expense.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (Number(expense.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  const lucroMes = receitasMes - despesasMes;

  // Receitas e despesas do mês anterior
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const receitasMesAnterior = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "paid") return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  const despesasMesAnterior = (expenses || []).reduce((sum: number, expense: any) => {
    if (!expense?.date) return sum;
    try {
      const d = parseLocalDate(expense.date);
      if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
        return sum + (Number(expense.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // Faturamento geral do mês atual (pagos + a pagar + vencidos)
  const faturamentoGeralMesAtual = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // Receita por hora trabalhada: Faturamento bruto mensal / Horas trabalhadas no mês
  // Valor padrão: 160 horas/mês (40h/semana × 4 semanas)
  const horasTrabalhadasMes = 160; // TODO: Adicionar campo configurável no futuro
  const receitaPorHora =
    horasTrabalhadasMes > 0 ? faturamentoGeralMesAtual / horasTrabalhadasMes : 0;

  // Lucro líquido baseado em faturamento bruto: Faturamento bruto - Despesas
  const lucroLiquido = faturamentoGeralMesAtual - despesasMes;

  // Margem de lucro (%): (Lucro líquido / Receita Total) × 100
  // Receita Total = Faturamento bruto (tudo que foi faturado, não apenas o que foi pago)
  const margemLucro =
    faturamentoGeralMesAtual > 0 ? ((lucroLiquido / faturamentoGeralMesAtual) * 100) : 0;

  // Faturamento geral do mês anterior (pagos + a pagar + vencidos)
  const faturamentoGeralMesAnterior = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // Concentração de receita: % da receita que vem do maior cliente (baseado em faturamento bruto)
  const receitaPorCliente = new Map<string, number>();
  (financialEntries || []).forEach((entry: any) => {
    if (!entry?.due_date) return; // Inclui todos: paid e pending
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const clientId = entry.client_id || "unknown";
        const amount = Number(entry.amount) || 0;
        receitaPorCliente.set(clientId, (receitaPorCliente.get(clientId) || 0) + amount);
      }
    } catch { }
  });

  let maiorReceitaCliente = 0;
  let totalReceitasAgrupadas = 0;
  receitaPorCliente.forEach((receita) => {
    totalReceitasAgrupadas += receita;
    if (receita > maiorReceitaCliente) {
      maiorReceitaCliente = receita;
    }
  });

  // DEBUG: Log para verificar o cálculo
  console.log('🔍 DEBUG Concentração de Receita:', {
    faturamentoBrutoMes: faturamentoGeralMesAtual,
    totalReceitasAgrupadas,
    maiorReceitaCliente,
    numClientes: receitaPorCliente.size,
    receitasPorCliente: Array.from(receitaPorCliente.entries()).map(([id, val]) => ({ clientId: id, receita: val }))
  });

  const concentracaoReceita =
    faturamentoGeralMesAtual > 0 ? (maiorReceitaCliente / faturamentoGeralMesAtual) * 100 : 0;

  // Comparativo mensal: variação percentual do faturamento geral vs mês anterior
  const variacaoComparativoMensal =
    faturamentoGeralMesAnterior > 0
      ? ((faturamentoGeralMesAtual - faturamentoGeralMesAnterior) / faturamentoGeralMesAnterior) * 100
      : faturamentoGeralMesAtual > 0 ? 100 : 0;

  // Faturamento do mesmo mês do ano passado (pago + pendente)
  const faturamentoMesAnoPassado = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear - 1) {
        // Inclui tudo: paid e pending (tudo que deveria ser recebido no mesmo mês do ano passado)
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // Verificar se há dados do mês do ano anterior
  const hasDataMesAnoPassado = (financialEntries || []).some((entry: any) => {
    if (!entry?.due_date) return false;
    try {
      const d = parseLocalDate(entry.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear - 1;
    } catch {
      return false;
    }
  });

  // Comparativo mês atual vs mesmo mês do ano passado
  const variacaoMesAnoPassado =
    hasDataMesAnoPassado && faturamentoMesAnoPassado > 0
      ? ((faturamentoGeralMesAtual - faturamentoMesAnoPassado) / faturamentoMesAnoPassado) * 100
      : null;

  // A receber mês atual: pendentes não vencidos do mês corrente
  const aReceberMesAtual = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "pending") return sum;
    try {
      const dueDate = parseLocalDate(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      // Deve estar no mês atual e não estar vencido
      if (
        dueDate >= today &&
        dueDate.getMonth() === currentMonth &&
        dueDate.getFullYear() === currentYear
      ) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // Vencidos do mês atual: pendentes com due_date anterior a hoje, mas do mês atual
  const vencidos = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "pending") return sum;
    try {
      const dueDate = parseLocalDate(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      // Deve estar vencido (antes de hoje) e no mês atual
      if (
        dueDate < today &&
        dueDate.getMonth() === currentMonth &&
        dueDate.getFullYear() === currentYear
      ) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch { }
    return sum;
  }, 0);

  // ===== Funil de Prospecção (operacional) =====
  const EXCLUDED_FUNNEL_STAGES = new Set([
    "mentorado",
    "cliente",
    "geladeira",
    "equipe",
    "ignorar",
  ]);

  const getStageCountByName = (names: string[]): number => {
    const normalizedNames = names.map((n) => norm(n));
    const matchingStageIds = stages
      .filter((s: any) => normalizedNames.includes(norm(String(s?.name || ""))))
      .map((s: any) => s.id);
    return leads.filter((l: any) => matchingStageIds.includes(l?.stage)).length;
  };

  const getStageCountByPredicate = (predicate: (normalizedName: string) => boolean): number => {
    const matchingStageIds = stages
      .filter((s: any) => predicate(norm(String(s?.name || ""))))
      .map((s: any) => s.id);
    return leads.filter((l: any) => matchingStageIds.includes(l?.stage)).length;
  };

  const funnelStagesFiltered = stages.filter((s: any) => {
    const name = norm(String(s?.name || ""));
    return !EXCLUDED_FUNNEL_STAGES.has(name);
  });

  const leadsByStage = (stageId: string) => leads.filter((lead: any) => lead?.stage === stageId).length;

  const stagesWithLeads = funnelStagesFiltered
    .map((s: any) => ({ ...s, count: leadsByStage(s.id) }))
    .filter((s: any) => (s?.count || 0) > 0);

  const totalLeadsInFunnel = stagesWithLeads.reduce(
    (acc: number, s: any) => acc + (Number(s?.count) || 0),
    0
  );

  const semAtendimento = getStageCountByName(["Sem Atendimento"]);
  const emAtendimento = getStageCountByName(["Em Atendimento"]);
  const reunioesAgendadas = getStageCountByName(["Reunião Agendada"]);
  const propostasEnviadas = getStageCountByName(["Proposta Enviada"]);
  const followUp = getStageCountByPredicate((n) => n.includes("follow") || n.startsWith("followup"));

  const funnelChartData = stagesWithLeads.map((s: any) => ({
    name: String(s?.name || ""),
    Leads: Number(s?.count || 0),
  }));

  // ===== KPIs Faturamento Ano a Ano =====
  const revenueKPIs = calculateRevenueKPIs(financialEntries);

  // ===== Alertas Reais =====
  // Helper para formatar tempo relativo
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minuto${diffMins !== 1 ? "s" : ""} atrás`;
    if (diffHours < 24) return `${diffHours} hora${diffHours !== 1 ? "s" : ""} atrás`;
    if (diffDays === 1) return "1 dia atrás";
    return `${diffDays} dias atrás`;
  };

  // Calcular alertas
  const alerts: Alert[] = [];

  // 1. Faturas vencidas (danger)
  const faturasVencidas = (financialEntries || [])
    .filter((entry: any) => {
      if (!entry?.due_date || entry?.status !== "pending") return false;
      try {
        const dueDate = parseLocalDate(entry.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      } catch {
        return false;
      }
    })
    .slice(0, 5); // Limitar a 5 mais recentes

  for (const entry of faturasVencidas) {
    try {
      const dueDate = parseLocalDate(entry.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const clientName = (entry.clients as any)?.company || "Cliente desconhecido";
      const amount = formatCurrency(Number(entry.amount) || 0);

      alerts.push({
        id: `fatura-vencida-${entry.id}`,
        type: "danger",
        title: "Fatura vencida",
        description: `${clientName} - ${amount} vencida há ${daysOverdue} dia${daysOverdue !== 1 ? "s" : ""}`,
        timestamp: formatRelativeTime(dueDate),
      });
    } catch {
      // ignore
    }
  }

  // 2. Contratos vencendo em breve (warning) - próximos 30 dias
  const contratosVencendo = (contracts || []).filter((c: any) => {
    if (!c || (c.status !== "active" && c.status !== "expiring")) return false;
    const end = safeParseDate(c.end_date);
    if (!end) return false;

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const limit = new Date(in30);
    limit.setHours(23, 59, 59, 999);

    return endDay >= today && endDay <= limit;
  });

  for (const contract of contratosVencendo.slice(0, 5)) {
    try {
      const endDate = safeParseDate(contract.end_date);
      if (!endDate) continue;

      const daysUntilExpiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const clientName = contract.client?.company || "Cliente desconhecido";

      alerts.push({
        id: `contrato-vencendo-${contract.id}`,
        type: "warning",
        title: "Contrato vencendo",
        description: `${clientName} - Vence em ${daysUntilExpiration} dia${daysUntilExpiration !== 1 ? "s" : ""}`,
        timestamp: formatRelativeTime(endDate),
      });
    } catch {
      // ignore
    }
  }

  // 3. Leads sem movimentação (info) - sem atualização há 7+ dias
  const sevenDaysAgoForAlerts = new Date(today);
  sevenDaysAgoForAlerts.setDate(sevenDaysAgoForAlerts.getDate() - 7);

  const leadsSemAtualizacao = (leads || []).filter((lead: any) => {
    if (!lead?.updated_at) return false;
    const updated = safeParseDate(lead.updated_at);
    if (!updated) return false;
    const updatedDay = new Date(updated);
    updatedDay.setHours(0, 0, 0, 0);
    return updatedDay < sevenDaysAgoForAlerts;
  });

  for (const lead of leadsSemAtualizacao.slice(0, 5)) {
    try {
      const updated = safeParseDate(lead.updated_at);
      if (!updated) continue;

      const daysStale = Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      const leadName = lead.name || "Lead sem nome";

      alerts.push({
        id: `lead-sem-atualizacao-${lead.id}`,
        type: "info",
        title: "Lead sem movimentação",
        description: `${leadName} - ${daysStale} dia${daysStale !== 1 ? "s" : ""} sem atualização`,
        timestamp: formatRelativeTime(updated),
      });
    } catch {
      // ignore
    }
  }

  // Ordenar alertas por prioridade (danger > warning > info) e depois por timestamp
  const priorityOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => {
    if (priorityOrder[a.type] !== priorityOrder[b.type]) {
      return priorityOrder[a.type] - priorityOrder[b.type];
    }
    return 0; // Manter ordem original se mesma prioridade
  });

  // ===== Layout tokens (padronização) =====
  const PAGE_GAP = "gap-4 md:gap-5";
  const CARD = "liquid-glass dashboard-glow border-white/[0.05]";
  const SECTION_PAD = "p-5 md:p-6";
  const MINI = "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4";
  const MINI_TIGHT = "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-xl p-3";
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard</h1>
        </div>
      </div>

      {/* TOP KPIs */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${PAGE_GAP}`}>
        <StatsCard
          title="MRR (Mensal)"
          value={formatCurrency(monthlyRevenue)}
          icon={DollarSign}
          description="Contratos ativos"
          className={cn(CARD, "p-4")}
        />
        <StatsCard
          title="ARR (Anual)"
          value={formatCurrency(arr)}
          icon={TrendingUp}
          description="MRR × 12"
          className={cn(CARD, "p-4")}
        />
        <StatsCard
          title="Clientes Ativos"
          value={activeClients.toString()}
          icon={Users}
          description="Com tag Ativo"
          className={cn(CARD, "p-4")}
        />
        <StatsCard
          title="Contratos a vencer (30 dias)"
          value={expiringIn30Days.toString()}
          icon={Calendar}
          description="Risco de churn"
          className={cn(CARD, "p-4")}
        />
      </div>

      {/* SAÚDE FINANCEIRA (unidades) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Receita (Mês)</p>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(receitasMes)}</p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Despesas (Mês)</p>
          <p className="text-2xl font-bold text-red-500 tracking-tight">{formatCurrency(despesasMes)}</p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Lucro (Mês)</p>
          <p className={`text-2xl font-bold tracking-tight ${lucroMes >= 0 ? "text-green-400" : "text-red-500"}`}>
            {formatCurrency(lucroMes)}
          </p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">A Receber</p>
          <p className="text-2xl font-bold text-amber-400 tracking-tight">{formatCurrency(aReceberMesAtual)}</p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Vencidos</p>
          <p className="text-2xl font-bold text-red-500 tracking-tight">{formatCurrency(vencidos)}</p>
        </Card>
      </div>

      {/* KPIs Ano a Ano */}
      <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4`}>
        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Total {revenueKPIs.currentYear}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(revenueKPIs.totalCurrent)}</p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Recebido {revenueKPIs.currentYear}</p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(revenueKPIs.totalPaidCurrentYear)}
          </p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">A Receber {revenueKPIs.currentYear}</p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(revenueKPIs.totalPendingNotOverdueCurrentYear)}
          </p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Crescimento YoY</p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {revenueKPIs.yoyPct === null
              ? "—"
              : `${revenueKPIs.yoyPct > 0 ? "+" : ""}${revenueKPIs.yoyPct}%`}
          </p>
        </Card>

        <Card className="liquid-glass p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Mensal vs Ano Anterior</p>
          <p className={`text-2xl font-bold tracking-tight ${variacaoMesAnoPassado === null
            ? "text-white"
            : variacaoMesAnoPassado >= 0
              ? "text-green-400"
              : "text-red-400"
            }`}>
            {variacaoMesAnoPassado === null
              ? "—"
              : `${variacaoMesAnoPassado >= 0 ? "+" : ""}${variacaoMesAnoPassado.toFixed(1)}%`}
          </p>
        </Card>
      </div>

      {/* Gráfico Ano a Ano */}
      <RevenueYoYChart financialEntries={financialEntries as any[]} />

      {/* ALERTAS + FUNIL */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${PAGE_GAP} items-stretch`}>
        <div className="min-h-[520px]">
          <AlertCard className={cn(CARD, "p-4 h-full")} limit={10} alerts={alerts} />
        </div>

        <Card className={`liquid-glass ${SECTION_PAD} relative min-h-[520px]`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-base">Funil de Prospecção</span>
              </div>
              <p className="text-goat-gray-400 text-sm mt-1">
                Acompanhamento operacional (prospecção fria).
              </p>
            </div>

            <span className="text-goat-gray-300 text-sm">{totalLeadsInFunnel} lead(s)</span>
          </div>

          {/* KPIs operacionais */}
          <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 mb-3`}>
            <div className={`${MINI_TIGHT} flex flex-col items-center justify-center text-center`}>
              <p className="text-goat-gray-400 text-xs mb-1">Sem atendimento</p>
              <p className="text-xl font-bold text-white">{semAtendimento}</p>
            </div>
            <div className={`${MINI_TIGHT} flex flex-col items-center justify-center text-center`}>
              <p className="text-goat-gray-400 text-xs mb-1">Em atendimento</p>
              <p className="text-xl font-bold text-white">{emAtendimento}</p>
            </div>
            <div className={`${MINI_TIGHT} flex flex-col items-center justify-center text-center`}>
              <p className="text-goat-gray-400 text-xs mb-1">Reuniões</p>
              <p className="text-xl font-bold text-white">{reunioesAgendadas}</p>
            </div>
            <div className={`${MINI_TIGHT} flex flex-col items-center justify-center text-center`}>
              <p className="text-goat-gray-400 text-xs mb-1">Propostas</p>
              <p className="text-xl font-bold text-white">{propostasEnviadas}</p>
            </div>
            <div className={`${MINI_TIGHT} flex flex-col items-center justify-center text-center`}>
              <p className="text-goat-gray-400 text-xs mb-1">Follow-up</p>
              <p className="text-xl font-bold text-white">{followUp}</p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="w-full h-[380px]">
            {funnelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={funnelChartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="name" hide />

                  <YAxis
                    stroke="#A3A3A3"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171717",
                      borderColor: "#404040",
                      color: "#FFFFFF",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "#A3A3A3" }}
                    formatter={(value) => [Number(value), "Leads"]}
                  />

                  <Area
                    type="monotone"
                    dataKey="Leads"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFunnel)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-goat-gray-400">Nenhum dado disponível para exibir</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Clientes Recentes + Cards Futuros */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${PAGE_GAP}`}>
        {/* Clientes Recentes */}
        <Card className={`${CARD} p-4 md:p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white">Clientes Recentes</h3>
          </div>

          <div className="space-y-3">
            {clients.slice(0, 4).map((client: any, index: number) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 rounded-lg liquid-glass border-white/[0.05] dashboard-glow"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{client.company}</p>
                  <p className="text-goat-gray-400 text-xs truncate">Responsável: {client.responsible}</p>
                </div>
                <div className="text-right shrink-0 pl-4">
                  <span className="text-goat-gray-500 text-xs">
                    {new Date(client.created_at || "").toLocaleDateString("pt-BR")}
                  </span>
                  {client.plan && <p className="text-goat-purple text-xs mt-1">{client.plan}</p>}
                </div>
              </div>
            ))}

            {clients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-goat-gray-400">Nenhum cliente cadastrado ainda</p>
              </div>
            )}
          </div>
        </Card>

        {/* Cards Futuros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Ticket Médio</p>
            <p className="text-xl font-bold text-white">{formatCurrency(ticketMedioContratosAtivos)}</p>
            <p className="text-goat-gray-500 text-xs mt-1">Contratos ativos</p>
          </Card>

          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Churn</p>
            <p className="text-xl font-bold text-white">{churnRate.toFixed(1)}%</p>
            <p className="text-goat-gray-500 text-xs mt-1">Taxa de cancelamento</p>
          </Card>

          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Comparativo mensal</p>
            <p className={`text-xl font-bold ${variacaoComparativoMensal >= 0 ? "text-green-400" : "text-red-500"}`}>
              {variacaoComparativoMensal >= 0 ? "+" : ""}
              {variacaoComparativoMensal.toFixed(1)}%
            </p>
            <p className="text-goat-gray-500 text-xs mt-1">vs mês anterior (faturamento geral)</p>
          </Card>

          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Margem de lucro</p>
            <p className={`text-xl font-bold ${margemLucro > 40
              ? "text-green-400"
              : margemLucro >= 20 && margemLucro <= 40
                ? "text-white"
                : "text-red-500"
              }`}>
              {margemLucro.toFixed(1)}%
            </p>
            <p className="text-goat-gray-500 text-xs mt-1">Meta ideal: 20-40%</p>
          </Card>

          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Receita por hora</p>
            <p className="text-xl font-bold text-white">{formatCurrency(receitaPorHora)}</p>
            <p className="text-goat-gray-500 text-xs mt-1">Produtividade mensal ({horasTrabalhadasMes}h)</p>
          </Card>

          <Card className="liquid-glass border-white/[0.05] dashboard-glow p-4">
            <p className="text-goat-gray-400 text-xs mb-1">Concentração de receita</p>
            <p className={`text-xl font-bold ${concentracaoReceita <= 30
              ? "text-green-400"
              : "text-red-500"
              }`}>
              {concentracaoReceita.toFixed(1)}%
            </p>
            <p className="text-goat-gray-500 text-xs mt-1">
              {concentracaoReceita > 30 ? "Risco alto (>30%)" : "Diversificado (≤30%)"}
            </p>
          </Card>
        </div>
      </div>
    </div >
  );
}
