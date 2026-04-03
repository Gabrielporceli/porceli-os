import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardFilter {
    period: string; // 'day', 'week', 'month', '30d', '90d', 'custom'
    start?: Date;
    end?: Date;
}

// NEW: Drop-off Step Type
export interface DropoffStep {
    stage: string;
    nextStage: string;
    entered: number;     // "reached" from RPC
    dropped: number;     // "notAdvanced" from RPC (kept "dropped" for hook compat or update)
    // Actually RPC returns: reached, advanced, notAdvanced. Let's map.
    reached: number;
    advanced: number;
    notAdvanced: number;
    rate: number;
    slaLabel: string;
}

export function useSdrMetrics(filter: DashboardFilter = { period: 'month' }) {
    const { session } = useAuth();
    const userId = session?.user?.id;

    const { data, isLoading, error } = useQuery({
        queryKey: ["sdr-metrics", userId, filter.period, filter.start, filter.end],
        queryFn: async () => {
            if (!userId) return null;

            // Prepare args for RPC
            const args: any = {
                p_user_id: userId,
                p_period: filter.period
            };

            if (filter.period === 'all_time') {
                args.p_start = new Date('2000-01-01').toISOString();
            } else {
                // Only set start/end if explicitly provided and not all_time mode
                if (filter.start) args.p_start = filter.start.toISOString();
                if (filter.end) args.p_end = filter.end.toISOString();
            }

            const { data, error } = await (supabase.rpc as any)('sdr_metrics', args);

            if (error) {
                console.error("Error fetching SDR metrics:", error);
                throw error;
            }

            return data as any;
        },
        enabled: !!userId,
    });

    const metrics = data?.metrics || {};
    // dropoffSteps está no nível raiz de data, não dentro de metrics
    // A RPC agora retorna todos os campos necessários (stage, nextStage, reached, advanced, notAdvanced, rate, slaLabel)
    const dropoffStepsFromRpc = (data?.dropoffSteps || []).map((step: any) => ({
        stage: step.stage || '',
        nextStage: step.nextStage || 'N/A',
        entered: step.reached || 0,
        dropped: step.notAdvanced || 0,
        reached: step.reached || 0,
        advanced: step.advanced || 0,
        notAdvanced: step.notAdvanced || 0,
        rate: step.rate || 0,
        slaLabel: step.slaLabel || ''
    }));

    // Ensure defaults for all fields to prevent null crashes
    const safeMetrics = {
        totalLeadsContacted: metrics.totalLeadsContacted || 0,
        activeLeads: metrics.activeLeads || 0,
        responseRate: metrics.responseRate || 0,
        avgResponseTimeMinutes: metrics.avgResponseTimeMinutes || 0,
        scheduled: metrics.scheduled || 0,
        sdrRevenue: metrics.sdrRevenue || 0,
        volumeData: metrics.volumeData || [],
        outboundCount: metrics.outboundCount || 0,
        inboundCount: metrics.inboundCount || 0,
        optOutRate: metrics.optOutRate || 0,
        qualifiedRate: metrics.qualifiedRate || 0,
        avgFollowups: metrics.avgFollowups || 0,
        showRate: metrics.showRate || 0,
        noShowRate: metrics.noShowRate || 0,
        noShowCount: metrics.noShowCount || 0,
        rescheduledRate: metrics.rescheduledRate || 0,
        timeToScheduleStr: metrics.timeToScheduleStr || "N/A",
        qualityScore: metrics.qualityScore || 0,
        icpFitRate: metrics.icpFitRate || 0,
        medianFollowups: metrics.medianFollowups || 0,
        cancelRate: metrics.cancelRate || 0,
        stepRates: metrics.stepRates || [],
        funnelData: metrics.funnelData || [],
        inAttendanceToCustomerRate: metrics.inAttendanceToCustomerRate || 0,
        dropoffSteps: (dropoffStepsFromRpc || []) as DropoffStep[],
    };

    return {
        isLoading,
        error,
        metrics: {
            ...safeMetrics,
            // Helper for matching previous interface if needed, or stick to new one
            kpis: [
                { title: "Leads Acionados", value: safeMetrics.totalLeadsContacted, sub: "Total" },
                { title: "Taxa de Resposta", value: `${safeMetrics.responseRate}%`, sub: "Geral" },
                { title: "Agendamentos", value: safeMetrics.scheduled, sub: "Bot" },
                { title: "Pipeline Gerado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeMetrics.sdrRevenue), sub: "Estimado" }
            ]
        }
    };
}
