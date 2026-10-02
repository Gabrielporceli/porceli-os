/**
 * Todo o cálculo do Dashboard, isolado da tela.
 *
 * Existe pra duas telas poderem mostrar os MESMOS números em layouts
 * diferentes — a tela de produção e o laboratório de grid experimental
 * (/dashboard-grid) — sem duplicar 500 linhas de conta.
 */
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useStages } from "@/hooks/useStages";
import { useLeads } from "@/hooks/useLeads";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useExpenses } from "@/hooks/useExpenses";
import { calculateRevenueKPIs } from "@/components/Dashboard/RevenueYoYChart";

export function useDashboardData() {
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
      .replace(/[̀-ͯ]/g, "");

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

  // ===== Métricas de contrato =====
  // SÓ CONTRATOS RECORRENTES contam aqui (category = 'recorrente'): trabalho
  // pontual e parcela de rescisão não são mensalidade — antes o Distrato do
  // Growth Hub entrava no MRR e o cliente contava como ativo.
  //
  // VIGÊNCIA PELA DATA, NÃO PELO STATUS. O status 'active' deixava de fora os
  // contratos 'expiring' (que ainda estão valendo) e incluía contratos que só
  // começam no futuro. Um contrato vale do start_date até o fim efetivo: o
  // cancelled_at, se foi encerrado antes, senão o end_date.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const HOJE = today.getTime();
  const DIA = 24 * 60 * 60 * 1000;
  const MES = 30.4375 * DIA;
  const JANELA = HOJE + 365 * DIA;

  type Rec = { cliente: string; inicio: number; fim: number | null; valor: number };
  const recorrentes: Rec[] = [];
  for (const c of contracts as any[]) {
    if ((c?.category ?? "recorrente") !== "recorrente" || c?.single_payment) continue;
    const ini = safeParseDate(c.start_date);
    if (!c.client_id || !ini) continue;
    const fim = safeParseDate(c.cancelled_at) ?? safeParseDate(c.end_date);
    recorrentes.push({
      cliente: c.client_id,
      inicio: ini.getTime(),
      fim: fim ? fim.getTime() : null,
      valor: Number(c.monthly_value) || 0,
    });
  }
  const vigenteEm = (r: Rec, t: number) => r.inicio <= t && (r.fim === null || r.fim >= t);
  // Renovação = outro contrato recorrente do mesmo cliente começando até 30
  // dias antes ou depois do fim deste (cobre renovação com folga ou atraso).
  const temSucessor = (r: Rec) =>
    r.fim !== null &&
    recorrentes.some(
      (o) => o !== r && o.cliente === r.cliente && Math.abs(o.inicio - (r.fim as number)) <= 30 * DIA
    );

  const vigentesHoje = recorrentes.filter((r) => vigenteEm(r, HOJE));
  const monthlyRevenue = vigentesHoje.reduce((s, r) => s + r.valor, 0);
  const activeClients = new Set(vigentesHoje.map((r) => r.cliente)).size;

  // Ticket médio POR CLIENTE (um cliente com dois contratos é um cliente só).
  const ticketMedioContratosAtivos = activeClients > 0 ? monthlyRevenue / activeClients : 0;

  // ── Previsão de 12 meses ─────────────────────────────────────────────────
  // MRR × 12 supõe que tudo renova por um ano; aqui os contratos são de 3 a 6
  // meses e nem todos renovam. Dois números honestos no lugar dele:
  //   • contratado: o que já está assinado dentro dos próximos 12 meses;
  //   • previsto: contratado + renovações esperadas, pela taxa histórica.
  const mesesNaJanela = (de: number, ate: number) => Math.max(0, (Math.min(ate, JANELA) - Math.max(de, HOJE)) / MES);
  const receitaContratada12m = recorrentes.reduce(
    (s, r) => s + r.valor * mesesNaJanela(r.inicio, r.fim ?? JANELA),
    0
  );

  const encerrados = recorrentes.filter((r) => r.fim !== null && r.fim < HOJE);
  const taxaRenovacao = encerrados.length > 0 ? encerrados.filter(temSucessor).length / encerrados.length : 0;

  const renovacoesEsperadas12m = recorrentes
    .filter((r) => r.fim !== null && r.fim >= HOJE && r.fim < JANELA && !temSucessor(r))
    .reduce((s, r) => s + taxaRenovacao * r.valor * mesesNaJanela(r.fim as number, JANELA), 0);
  const receitaPrevista12m = receitaContratada12m + renovacoesEsperadas12m;

  // ── LTV: ticket médio × tempo médio de vida do cliente ──────────────────
  const ltv = (() => {
    const porCliente = new Map<string, Rec[]>();
    for (const r of recorrentes) porCliente.set(r.cliente, [...(porCliente.get(r.cliente) || []), r]);
    const vidas: number[] = [];
    porCliente.forEach((lista) => {
      const primeiro = Math.min(...lista.map((r) => r.inicio));
      if (primeiro > HOJE) return;
      const ativo = lista.some((r) => vigenteEm(r, HOJE));
      const ultimo = ativo ? HOJE : Math.max(...lista.map((r) => r.fim ?? HOJE));
      vidas.push(Math.max(1, (ultimo - primeiro) / MES));
    });
    if (!vidas.length) return 0;
    return ticketMedioContratosAtivos * (vidas.reduce((a, b) => a + b, 0) / vidas.length);
  })();

  // ── Contratos a vencer SEM renovação registrada (30 dias) ────────────────
  // Os que já têm o próximo contrato cadastrado não são risco.
  const expiringIn30Days = vigentesHoje.filter(
    (r) => r.fim !== null && r.fim <= HOJE + 30 * DIA && !temSucessor(r)
  ).length;

  // ===== KPIs Saúde Financeira =====
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const despesasMes = (expenses || []).reduce((sum: number, expense: any) => {
    if (!expense?.date) return sum;
    try {
      const d = parseLocalDate(expense.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (Number(expense.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);


  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const faturamentoGeralMesAtual = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  const horasTrabalhadasMes = 160;
  const receitaPorHora =
    horasTrabalhadasMes > 0 ? faturamentoGeralMesAtual / horasTrabalhadasMes : 0;

  const lucroLiquido = faturamentoGeralMesAtual - despesasMes;

  const margemLucro =
    faturamentoGeralMesAtual > 0 ? (lucroLiquido / faturamentoGeralMesAtual) * 100 : 0;

  const faturamentoGeralMesAnterior = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  const receitaPorCliente = new Map<string, number>();
  (financialEntries || []).forEach((entry: any) => {
    if (!entry?.due_date) return;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const clientId = entry.client_id || "unknown";
        const amount = Number(entry.amount) || 0;
        receitaPorCliente.set(clientId, (receitaPorCliente.get(clientId) || 0) + amount);
      }
    } catch {}
  });

  let maiorReceitaCliente = 0;
  let totalReceitasAgrupadas = 0;
  receitaPorCliente.forEach((receita) => {
    totalReceitasAgrupadas += receita;
    if (receita > maiorReceitaCliente) {
      maiorReceitaCliente = receita;
    }
  });

  const concentracaoReceita =
    faturamentoGeralMesAtual > 0 ? (maiorReceitaCliente / faturamentoGeralMesAtual) * 100 : 0;

  const variacaoComparativoMensal =
    faturamentoGeralMesAnterior > 0
      ? ((faturamentoGeralMesAtual - faturamentoGeralMesAnterior) / faturamentoGeralMesAnterior) * 100
      : faturamentoGeralMesAtual > 0
        ? 100
        : 0;

  const faturamentoMesAnoPassado = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date) return sum;
    try {
      const d = parseLocalDate(entry.due_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear - 1) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  const hasDataMesAnoPassado = (financialEntries || []).some((entry: any) => {
    if (!entry?.due_date) return false;
    try {
      const d = parseLocalDate(entry.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear - 1;
    } catch {
      return false;
    }
  });

  const variacaoMesAnoPassado =
    hasDataMesAnoPassado && faturamentoMesAnoPassado > 0
      ? ((faturamentoGeralMesAtual - faturamentoMesAnoPassado) / faturamentoMesAnoPassado) * 100
      : null;

  const aReceberMesAtual = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "pending") return sum;
    try {
      const dueDate = parseLocalDate(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (
        dueDate >= today &&
        dueDate.getMonth() === currentMonth &&
        dueDate.getFullYear() === currentYear
      ) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  const vencidos = (financialEntries || []).reduce((sum: number, entry: any) => {
    if (!entry?.due_date || entry?.status !== "pending") return sum;
    try {
      const dueDate = parseLocalDate(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        return sum + (Number(entry.amount) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  // ===== Funil de Prospecção (operacional) =====
  const EXCLUDED_FUNNEL_STAGES = new Set([
    "mentorado",
    "cliente",
    "geladeira",
    "equipe",
    "ignorar",
    "lead casa",
  ]);

  const funnelStagesFiltered = stages.filter((s: any) => {
    const name = norm(String(s?.name || ""));
    return !EXCLUDED_FUNNEL_STAGES.has(name);
  });

  const leadsByStage = (stageId: string) => leads.filter((lead: any) => lead?.stage === stageId).length;

  // Todas as etapas do funil, na ordem do Kanban — inclusive as vazias: no
  // desenho de funil, uma etapa zerada é informação, não ruído.
  const funnelStages = funnelStagesFiltered.map((s: any) => ({
    name: String(s?.name || ""),
    count: leadsByStage(s.id),
  }));

  // ===== Séries reais mês a mês (últimos 6 meses, o atual por último) =====
  // Cada série usa a MESMA definição do número exibido no card, então o
  // último ponto da curva é o próprio número.
  const ultimosMeses = (qtd: number) =>
    Array.from({ length: qtd }, (_, k) => {
      const dt = new Date(today.getFullYear(), today.getMonth() - (qtd - 1 - k), 1);
      return { m: dt.getMonth(), y: dt.getFullYear() };
    });

  const noMes = (dateStr: string | undefined, m: number, y: number) => {
    if (!dateStr) return false;
    const dt = parseLocalDate(dateStr);
    return dt.getMonth() === m && dt.getFullYear() === y;
  };

  // Faturamento geral (pago + pendente) de um mês — base do comparativo e
  // da concentração, igual a faturamentoGeralMesAtual.
  const faturamentoDoMes = (m: number, y: number) =>
    (financialEntries || []).reduce(
      (sum: number, e: any) => (noMes(e?.due_date, m, y) ? sum + (Number(e.amount) || 0) : sum),
      0
    );

  // Comparativo: variação % de cada mês contra o anterior (7 meses → 6 pontos).
  const comparativoTrend = (() => {
    const fat = ultimosMeses(7).map(({ m, y }) => faturamentoDoMes(m, y));
    return fat.slice(1).map((atual, k) => {
      const anterior = fat[k];
      const v = anterior > 0 ? ((atual - anterior) / anterior) * 100 : atual > 0 ? 100 : 0;
      return { value: v };
    });
  })();

  // Concentração: % do faturamento do mês que veio do maior cliente.
  const concentracaoTrend = ultimosMeses(6).map(({ m, y }) => {
    const porCliente = new Map<string, number>();
    let totalMes = 0;
    for (const e of financialEntries || []) {
      if (!noMes((e as any)?.due_date, m, y)) continue;
      const v = Number((e as any).amount) || 0;
      totalMes += v;
      const id = (e as any).client_id || "unknown";
      porCliente.set(id, (porCliente.get(id) || 0) + v);
    }
    const maior = Math.max(0, ...porCliente.values());
    return { value: totalMes > 0 ? (maior / totalMes) * 100 : 0 };
  });

  // Churn MENSAL (logo churn): dos clientes com contrato recorrente valendo no
  // 1º dia do mês, quantos terminaram o mês sem nenhum — nem um contrato
  // cobrindo o fim do mês, nem um novo começando até 30 dias depois (isso é
  // renovação com folga, não saída). No mês corrente o "fim" é hoje.
  //
  // Antes o número era "perdidos ÷ todos os clientes já cadastrados",
  // acumulado desde sempre — só subia, nunca era uma taxa.
  const churnTrend = ultimosMeses(6).map(({ m, y }) => {
    const inicioMes = new Date(y, m, 1).getTime();
    const corte = Math.min(new Date(y, m + 1, 0).getTime(), HOJE);
    const ativos = new Set(recorrentes.filter((r) => vigenteEm(r, inicioMes)).map((r) => r.cliente));
    let perdidos = 0;
    ativos.forEach((cli) => {
      const segue = recorrentes.some(
        (r) => r.cliente === cli && (r.fim === null || r.fim >= corte) && r.inicio <= corte + 30 * DIA
      );
      if (!segue) perdidos++;
    });
    return { value: ativos.size > 0 ? (perdidos / ativos.size) * 100 : 0 };
  });
  // O número do card é a MÉDIA mensal do período — um mês só é ruidoso
  // demais com essa quantidade de clientes (1 saída já vale ~10%).
  const churnRate = churnTrend.reduce((s, p) => s + p.value, 0) / churnTrend.length;

  const revenueKPIs = calculateRevenueKPIs(financialEntries as any[]);

  return {
    formatCurrency,
    monthlyRevenue,
    receitaContratada12m,
    receitaPrevista12m,
    taxaRenovacao,
    activeClients,
    ticketMedioContratosAtivos,
    ltv,
    churnRate,
    expiringIn30Days,
    faturamentoGeralMesAtual,
    lucroLiquido,
    receitaPorHora,
    margemLucro,
    concentracaoReceita,
    variacaoComparativoMensal,
    variacaoMesAnoPassado,
    aReceberMesAtual,
    vencidos,
    funnelStages,
    comparativoTrend,
    concentracaoTrend,
    churnTrend,
    revenueKPIs,
    financialEntries,
  };
}
