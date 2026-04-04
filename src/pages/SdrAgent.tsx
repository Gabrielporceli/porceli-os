import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import {
    MessageSquare,
    Calendar,
    Target,
    TrendingUp,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    DollarSign,
    Star,
    Bot,
    Zap
} from "lucide-react";
import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell,
    LabelList
} from "recharts";

import { useSdrMetrics, DashboardFilter } from "@/hooks/useSdrMetrics";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Removed unused imports
import { Button } from "@/components/ui/button";

export default function SdrAgent() {
    const [period, setPeriod] = useState<DashboardFilter['period']>('month');
    const { metrics, isLoading } = useSdrMetrics({ period });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-Porceli-purple"></div>
                <span className="ml-2">Carregando dados do agente...</span>
            </div>
        );
    }

    // fallback for missing metrics if any
    const {
        volumeData = [],
        outboundCount = 0,
        avgResponseTimeMinutes = 0,
        responseRate = 0,
        scheduled = 0,
        sdrRevenue = 0,
        optOutRate = 0,
        qualifiedRate = 0,
        avgFollowups = 0,
        showRate = 0,
        noShowRate = 0,
        rescheduledRate = 0,
        timeToScheduleStr = "N/A",
        qualityScore = 0,
        stepRates = [],
        funnelData = [],
        medianFollowups = 0,
        cancelRate = 0,
        inAttendanceToCustomerRate = 0,
        dropoffSteps = []
    } = metrics;

    const kpis = [
        { title: "Leads", value: metrics.totalLeadsContacted, icon: Users, sub: "Total no período" },
        { title: "Taxa de Resposta", value: `${responseRate.toFixed(1)}%`, icon: MessageSquare, sub: "Geral" },
        { title: "Agendamentos", value: scheduled, icon: Calendar, sub: "Bot" },
        { title: "MRR Gerado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sdrRevenue), icon: DollarSign, sub: "Estimado" }
    ];

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Agente SDR</h1>

                </div>

                <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button
                            onClick={() => setPeriod('day')}
                            className={`${period === 'day' ? 'bg-primary text-white shadow-[0_0_20px_rgba(104,41,192,0.3)]' : 'liquid-glass text-white/70 border-white/5 hover:bg-white/10 hover:text-white'} h-11 px-6 rounded-2xl font-bold transition-all`}
                        >
                            Hoje
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button
                            onClick={() => setPeriod('week')}
                            className={`${period === 'week' ? 'bg-primary text-white shadow-[0_0_20px_rgba(104,41,192,0.3)]' : 'liquid-glass text-white/70 border-white/5 hover:bg-white/10 hover:text-white'} h-11 px-6 rounded-2xl font-bold transition-all`}
                        >
                            Semana
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button
                            onClick={() => setPeriod('month')}
                            className={`${period === 'month' ? 'bg-primary text-white shadow-[0_0_20px_rgba(104,41,192,0.3)]' : 'liquid-glass text-white/70 border-white/5 hover:bg-white/10 hover:text-white'} h-11 px-6 rounded-2xl font-bold transition-all`}
                        >
                            Mês
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button
                            onClick={() => setPeriod('all_time')}
                            className={`${period === 'all_time' ? 'bg-primary text-white shadow-[0_0_20px_rgba(104,41,192,0.3)]' : 'liquid-glass text-white/70 border-white/5 hover:bg-white/10 hover:text-white'} h-11 px-6 rounded-2xl font-bold transition-all`}
                        >
                            Total
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {kpis.map((kpi) => (
                    <StatsCard
                        key={kpi.title}
                        title={kpi.title}
                        value={kpi.value.toString()}
                        icon={kpi.icon}
                        description={kpi.sub}
                        className="dashboard-glow p-4"
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda: Drop-off por Etapa e Impacto no Negócio */}
                <div className="space-y-6">
                    <Card className="liquid-glass border-white/5 dashboard-glow p-6 group hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white">Drop-off por Etapa</h3>
                        </div>
                        <p className="text-sm text-white/40 mb-6">% de leads que não avançaram dentro do SLA configurado</p>

                        <div className="space-y-5">
                            {dropoffSteps.map((step: any, idx: number) => (
                                <div key={idx} className="relative">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{step.stage}</span>
                                            <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">
                                                SLA: {step.slaLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Progress Bar Container */}
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                                            {/* Background track */}
                                            <div className="absolute inset-0 bg-white/5" />

                                            {/* Fill bar */}
                                            {step.reached > 0 && step.rate > 0 && (
                                                <div
                                                    className="h-full bg-gradient-to-r from-red-500/70 to-red-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(step.rate, 100)}%` }}
                                                />
                                            )}
                                        </div>

                                        {/* Value Label */}
                                        <div className="w-24 text-right">
                                            {step.reached > 0 ? (
                                                <div className="flex flex-col items-end leading-none">
                                                    <span className="text-sm font-bold text-red-300">{step.rate}%</span>
                                                    <span className="text-[10px] text-gray-500 mt-0.5">({step.notAdvanced}/{step.reached})</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-600">0% (0/0)</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-1 pl-1">Próxima: {step.nextStage}</p>
                                </div>
                            ))}

                            {dropoffSteps.length === 0 && (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Nenhum dado de drop-off disponível para o período.
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Impacto no Negócio */}
                    <Card className="liquid-glass border-white/5 dashboard-glow p-6 group hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="text-lg font-semibold text-white">Impacto no Negócio</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 flex flex-col">
                                <div className="liquid-glass p-3 rounded-lg border border-white/5 h-[90px] flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Conversão Real</span>
                                    <div>
                                        <p className="text-xl font-bold text-white">{inAttendanceToCustomerRate.toFixed(1)}%</p>
                                        <p className="text-[10px] text-white/30 mt-1">Em Atend. → Cliente</p>
                                    </div>
                                </div>
                                <div className="liquid-glass p-3 rounded-lg border border-white/5 h-[90px] flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Qualidade do Lead</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star
                                                    key={i}
                                                    className={`w-3 h-3 text-yellow-400 ${i <= qualityScore ? 'fill-yellow-400' : ''}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-lg font-bold text-white">{qualityScore.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 flex flex-col">
                                <div className="liquid-glass p-3 rounded-lg border border-white/5 h-[90px] flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Receita Atribuída</span>
                                    <div>
                                        <p className="text-xl font-bold text-white tabular-nums">
                                            {new Intl.NumberFormat('pt-BR', { 
                                                style: 'currency', 
                                                currency: 'BRL',
                                                maximumFractionDigits: 0
                                            }).format(sdrRevenue)}
                                        </p>
                                        <p className="text-[10px] text-white/30 mt-1">MRR (Bot SDR)</p>
                                    </div>
                                </div>
                                <div className="liquid-glass p-3 rounded-lg border border-white/5 h-[90px] flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Receita Atribuída</span>
                                    <div>
                                        <p className="text-xl font-bold text-white tabular-nums">
                                            {new Intl.NumberFormat('pt-BR', { 
                                                style: 'currency', 
                                                currency: 'BRL',
                                                maximumFractionDigits: 0
                                            }).format(sdrRevenue * 12)}
                                        </p>
                                        <p className="text-[10px] text-white/30 mt-1">ARR (Bot SDR)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Coluna Direita: Entrega e Volume, Engajamento Inicial, Agendamento & Show Rate */}
                <div className="space-y-6 flex flex-col">
                    {/* 1. Entrega e Volume */}
                    <Card className="liquid-glass border-white/5 dashboard-glow p-6 pb-8 transition-all hover:bg-white/[0.04] group rounded-xl flex-1">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/[0.05]">
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight">Entrega e Volume</h3>
                            <p className="text-sm text-white/50">Fluxo de mensagens e novos leads</p>
                        </div>
                    </div>

                    {/* KPIs Compactos */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                        {/* KPI 1 */}
                        <div className="liquid-glass p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group/kpi">
                            <p className="text-3xl font-bold text-white tracking-tight mb-1 group-hover/kpi:text-primary transition-colors">
                                {metrics.scheduled > 0 ? Math.round(outboundCount / metrics.scheduled) : (metrics.totalLeadsContacted > 0 ? "—" : 0)}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Mensagens/Reunião</p>
                        </div>

                        {/* KPI 2 */}
                        <div className="liquid-glass p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group/kpi">
                            <p className="text-3xl font-bold text-white tracking-tight mb-1 group-hover/kpi:text-primary transition-colors">
                                {new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(outboundCount)}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Mensagens</p>
                        </div>

                        {/* KPI 3 (Novo: Leads Novos) */}
                        <div className="liquid-glass p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group/kpi">
                            <p className="text-3xl font-bold text-white tracking-tight mb-1 group-hover/kpi:text-primary transition-colors">
                                {new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(
                                    volumeData.reduce((acc: number, cur: any) => acc + (cur.leads || 0), 0)
                                )}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Leads Novos</p>
                        </div>
                    </div>

                    <div className="h-[200px] w-full relative">
                        {volumeData.length === 0 || volumeData.every((d: any) => d.sent === 0 && d.leads === 0) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                                <div className="p-4 bg-white/5 rounded-full mb-4 shadow-inner">
                                    <TrendingUp className="w-8 h-8 text-white/30" />
                                </div>
                                <p className="text-base font-semibold text-white/50">Sem dados no período</p>
                                <p className="text-sm text-white/30 mt-2 max-w-[220px]">
                                    Ajuste o filtro de período ou verifique a atividade do bot.
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={volumeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#737373"
                                        fontSize={12}
                                        fontWeight={500}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        dy={12}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                                        contentStyle={{
                                            backgroundColor: '#171717',
                                            border: '1px solid #404040',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })}
                                    />
                                    <Bar
                                        dataKey="sent"
                                        name="Mensagens Enviadas"
                                        fill="#8B5CF6"
                                        radius={[6, 6, 0, 0]}
                                        barSize={32}
                                        fillOpacity={0.9}
                                    />
                                    <Bar
                                        dataKey="leads"
                                        name="Novos Leads"
                                        fill="#3B82F6"
                                        radius={[6, 6, 0, 0]}
                                        barSize={32}
                                        fillOpacity={0.9}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    </Card>

                    {/* 2. Engajamento Inicial */}
                    <Card className="liquid-glass border-white/5 dashboard-glow p-6 transition-all hover:bg-white/[0.04] group rounded-xl flex-1">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/[0.05]">
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight">Engajamento Inicial</h3>
                            <p className="text-sm text-white/50">Tempo de resposta e qualificação</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                        {/* Mini-card 1: Tempo 1ª Resp */}
                        <div className="liquid-glass rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Tempo 1ª Resp</p>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-bold text-white tracking-tight">{avgResponseTimeMinutes}</p>
                                <span className="text-sm text-white/30 font-medium">min</span>
                            </div>
                        </div>

                        {/* Mini-card 2: Opt-out */}
                        <div className="liquid-glass rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"></div>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Recusas</p>
                            </div>
                            <p className="text-3xl font-bold text-white tracking-tight">{optOutRate.toFixed(1)}%</p>
                        </div>

                        {/* Mini-card 3: Qualificação */}
                        <div className="liquid-glass rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Qualificação</p>
                            </div>
                            <p className="text-3xl font-bold text-white tracking-tight">{qualifiedRate.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="h-[200px] w-full relative">
                        {funnelData.length === 0 || funnelData.every((d: any) => d.value === 0) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                                <div className="p-4 bg-white/5 rounded-full mb-4 shadow-inner">
                                    <Zap className="w-8 h-8 text-white/30" />
                                </div>
                                <p className="text-base font-semibold text-white/50">Sem dados de engajamento</p>
                                <p className="text-sm text-white/30 mt-2 max-w-[220px]">
                                    Aguarde novas interações com leads.
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={funnelData}
                                    layout="vertical"
                                    margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                                    barCategoryGap={15}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="#D4D4D4"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        width={110}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={36} animationDuration={1000}>
                                        <LabelList dataKey="value" position="right" fill="#ffffff" fontSize={13} fontWeight={600} />
                                        {funnelData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    </Card>

                    {/* 4. Agendamento & Show Rate */}
                    <Card className="liquid-glass border-white/5 dashboard-glow p-5 pb-4 group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-white">Agendamento & Show Rate</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-3">
                            <div className="liquid-glass p-3 rounded-lg border border-white/5 min-h-[60px] hover:bg-white/[0.04] transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Taxa de Agend.</span>
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                                <p className="text-xl font-bold text-white">{metrics.totalLeadsContacted > 0 ? (scheduled / metrics.totalLeadsContacted * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="liquid-glass p-3 rounded-lg border border-white/5 min-h-[60px] hover:bg-white/[0.04] transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Reagendamentos</span>
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                </div>
                                <p className="text-xl font-bold text-white">{rescheduledRate.toFixed(1)}%</p>
                            </div>
                            <div className="liquid-glass p-3 rounded-lg border border-white/5 min-h-[60px] hover:bg-white/[0.04] transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Cancelamento</span>
                                    <XCircle className="w-4 h-4 text-white/50" />
                                </div>
                                <p className="text-xl font-bold text-white">{cancelRate.toFixed(1)}%</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="liquid-glass p-3 rounded-lg border border-white/5 min-h-[60px] hover:bg-white/[0.04] transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Show Rate</span>
                                    <Users className="w-4 h-4 text-primary" />
                                </div>
                                <p className="text-xl font-bold text-white">{showRate.toFixed(0)}%</p>
                            </div>
                            <div className="liquid-glass p-3 rounded-lg border border-white/5 min-h-[60px] hover:bg-white/[0.04] transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">No-Show</span>
                                    <XCircle className="w-4 h-4 text-red-500" />
                                </div>
                                <p className="text-xl font-bold text-white">{noShowRate.toFixed(0)}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.05] flex justify-between items-center">
                        <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Tempo até agendar:</span>
                        <span className="font-mono text-white text-sm bg-white/5 px-2 py-1 rounded-md">{timeToScheduleStr} (média)</span>
                    </div>
                    </Card>
                </div>
            </div>

        </div>
    );
}
