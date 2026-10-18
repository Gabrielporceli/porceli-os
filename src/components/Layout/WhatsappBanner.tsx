/**
 * Faixa de aviso quando o WhatsApp da instância cai.
 *
 * O estado vem de `whatsapp_status`, mantido pela função `whatsapp-health`
 * (checa a Evolution a cada 2 min). Sem WhatsApp, relatórios diários, alertas
 * financeiros e cobranças a clientes não saem — e as funções de envio
 * respondem "sucesso" mesmo assim, então sem isto ninguém percebe.
 *
 * Só aparece com a queda confirmada (~10 min seguidos); oscilação rápida não avisa.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Danger } from "iconsax-react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/ui/icon";

interface Status {
  state: "open" | "down";
  since: string;
  checked_at: string;
  detail: string | null;
}


/** Visual comum dos cards de aviso do canto inferior direito. */
export const ALERTA_BASE =
  "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl " +
  "animate-in fade-in slide-in-from-bottom-4 duration-300 ";

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Status | null }> } };
  };
};

function formatar(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function WhatsappBanner() {
  const queryClient = useQueryClient();
  const [verificando, setVerificando] = useState(false);
  // Fechar esconde só o aviso atual — se o estado mudar, ele volta.
  const [fechadoEm, setFechadoEm] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const { data } = await db
        .from("whatsapp_status")
        .select("state, since, checked_at, detail")
        .eq("instance", "agencia03")
        .maybeSingle();
      return data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data) return null;

  // Só a queda confirmada (~10 min seguidos, ver whatsapp-health). Monitor
  // parado = os crons pararam, e isso é mostrado pelo aviso de automações.
  if (data.state !== "down") return null;
  const chave = `down-${data.since}`;

  // Roda a checagem na hora (em vez de esperar o cron de 2 min) e relê o estado.
  const verificar = async () => {
    setVerificando(true);
    try {
      await supabase.functions.invoke("whatsapp-health");
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      setVerificando(false);
    }
  };

  if (fechadoEm === chave) return null;

  // Card da pilha de avisos do canto inferior direito (ver SystemAlerts).
  return (
    <div
      role="alert"
      className={
        ALERTA_BASE +
        "border-red-500/40 bg-[#2b1115]/95 text-red-100"
      }
    >
      <Icon as={Danger} size={20} className="mt-0.5 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">WhatsApp desconectado desde {formatar(data.since)}</p>
        <p className="text-red-100/80">
          Relatórios, alertas e cobranças ficam na fila e saem quando reconectar.
          Reconecte a instância <b>agencia03</b> lendo o QR code.
        </p>
        {data.detail && <p className="mt-0.5 text-xs text-red-100/50">{data.detail}</p>}
        <button
          type="button"
          onClick={verificar}
          disabled={verificando}
          className="acao-texto mt-2 disabled:opacity-50"
        >
          {verificando ? "Verificando..." : "Verificar novamente"}
        </button>
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
