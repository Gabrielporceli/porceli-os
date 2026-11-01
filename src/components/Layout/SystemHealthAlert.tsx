/**
 * Aviso de falhas das automações (crons) e da fila de WhatsApp.
 *
 * Os dados vêm de `system_health()` (ver migração fila_whatsapp_e_monitor_crons):
 *   • jobs cuja última execução falhou de verdade (resposta HTTP real, não só
 *     "o cron disparou") — com botão para rodar de novo;
 *   • mensagens que esgotaram as tentativas — reenviar ou descartar;
 *   • fila parada (mensagem esperando há 30+ min) ou worker sem rodar.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Danger } from "iconsax-react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/ui/icon";
import { ALERTA_BASE } from "./WhatsappBanner";

interface Saude {
  jobs_com_falha: { job: string; detail: string | null; quando: string; http: number | null }[];
  mensagens_com_falha: number;
  mensagens_na_fila: number;
  fila_parada_desde: string | null;
  worker_ultima_execucao: string | null;
}

// Nomes legíveis dos jobs (jobname do pg_cron).
const NOMES: Record<string, string> = {
  "send-scheduled-messages": "Mensagens agendadas",
  "vigilante-tarefas-10min": "Lembrete de tarefas",
  "whatsapp-health-check": "Monitor do WhatsApp",
  "asaas-alertas-pagamento": "Alertas de pagamento",
  "alerta-financeiro-diario": "Relatório financeiro",
  "asaas-reconciliacao": "Conciliação do Asaas",
  "resumo-diario-whatsapp": "Resumo diário",
  "verificar-contratos-diario": "Status dos contratos",
  "whatsapp-outbox": "Fila de WhatsApp",
};

const WORKER_PARADO_MIN = 5;

// Chamado pelo próprio cliente (supabase.rpc perde o `this` se for guardado solto).
// As funções novas ainda não estão nos tipos gerados.
const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (f: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> })
    .rpc(fn, args);

function hora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SystemHealthAlert() {
  const queryClient = useQueryClient();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [fechadoEm, setFechadoEm] = useState<string | null>(null);

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const { data, error } = await rpc("system_health");
      if (error) throw new Error(error.message);
      return data as Saude;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data) return null;

  const jobs = data.jobs_com_falha ?? [];
  // Mede contra a hora em que o dado foi lido, não contra o relógio de agora: com a aba em
  // segundo plano (ou o computador hibernando) a tela se redesenha com a última resposta
  // guardada antes da busca nova voltar, e o atraso aparente virava "fila parada" falso.
  const minutosSemWorker = data.worker_ultima_execucao
    ? (dataUpdatedAt - new Date(data.worker_ultima_execucao).getTime()) / 60_000
    : null;
  const workerParado = minutosSemWorker !== null && minutosSemWorker > WORKER_PARADO_MIN;
  const temProblema = jobs.length > 0 || data.mensagens_com_falha > 0 || workerParado;
  if (!temProblema) return null;

  // Fechar esconde só esta combinação de problemas; se mudar, o aviso volta.
  const chave = JSON.stringify([jobs.map((j) => j.job + j.quando), data.mensagens_com_falha, workerParado]);
  if (fechadoEm === chave) return null;

  const executar = async (id: string, fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setOcupado(id);
    try {
      const { error } = await fn();
      if (error) toast.error(error.message);
      else toast.success(ok);
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["system-health"] });
      setOcupado(null);
    }
  };

  return (
    <div role="alert" className={ALERTA_BASE + "border-red-500/40 bg-[#2b1115]/95 text-red-100"}>
      <Icon as={Danger} size={20} className="mt-0.5 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="font-bold">Falha nas automações</p>

        {jobs.map((j) => (
          <div key={j.job}>
            <p className="text-red-100/90">
              <b>{NOMES[j.job] ?? j.job}</b> falhou em {hora(j.quando)}
              {j.http ? ` (HTTP ${j.http})` : ""}
            </p>
            {j.detail && <p className="line-clamp-2 text-xs text-red-100/50">{j.detail}</p>}
            <button
              type="button"
              disabled={ocupado !== null}
              onClick={() => executar(j.job, () => rpc("cron_retry", { p_job: j.job }), "Rodando de novo — o resultado aparece em 1 minuto.")}
              className="acao-texto mt-1 disabled:opacity-50"
            >
              {ocupado === j.job ? "Disparando..." : "Rodar de novo"}
            </button>
          </div>
        ))}

        {data.mensagens_com_falha > 0 && (
          <div>
            <p className="text-red-100/90">
              <b>{data.mensagens_com_falha}</b> mensage{data.mensagens_com_falha === 1 ? "m" : "ns"} de WhatsApp não
              {data.mensagens_com_falha === 1 ? " saiu" : " saíram"} depois de 5 tentativas.
            </p>
            <div className="mt-1 flex gap-4">
              <button
                type="button"
                disabled={ocupado !== null}
                onClick={() => executar("reenviar", () => rpc("outbox_retry_failed"), "Mensagens de volta na fila.")}
                className="acao-texto disabled:opacity-50"
              >
                {ocupado === "reenviar" ? "Reenviando..." : "Reenviar"}
              </button>
              <button
                type="button"
                disabled={ocupado !== null}
                onClick={() => executar("descartar", () => rpc("outbox_discard_failed"), "Mensagens descartadas.")}
                className="acao-texto perigo disabled:opacity-50"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {workerParado && (
          <p className="text-red-100/90">
            A fila de WhatsApp não roda desde {hora(data.worker_ultima_execucao!)}
            {data.mensagens_na_fila > 0 ? ` — ${data.mensagens_na_fila} mensage${data.mensagens_na_fila === 1 ? "m esperando" : "ns esperando"}` : ""}.
          </p>
        )}
      </div>
      <button
        type="button"
        title="Fechar"
        onClick={() => setFechadoEm(chave)}
        className="shrink-0 rounded-full p-1 text-white/50 transition-colors hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
