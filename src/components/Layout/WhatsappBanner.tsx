/**
 * Faixa de aviso quando o WhatsApp da instância cai.
 *
 * O estado vem de `whatsapp_status`, mantido pela função `whatsapp-health`
 * (checa a Evolution a cada 2 min). Sem WhatsApp, relatórios diários, alertas
 * financeiros e cobranças a clientes não saem — e as funções de envio
 * respondem "sucesso" mesmo assim, então sem isto ninguém percebe.
 *
 * Também avisa se o próprio monitor parou de atualizar (estado velho).
 */
import { useQuery } from "@tanstack/react-query";
import { Danger } from "iconsax-react";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/ui/icon";

interface Status {
  state: "open" | "down";
  since: string;
  checked_at: string;
  detail: string | null;
}

const MONITOR_PARADO_MIN = 10;

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

  const minutosSemChecar = (Date.now() - new Date(data.checked_at).getTime()) / 60_000;
  const caiu = data.state === "down";
  const monitorParado = !caiu && minutosSemChecar > MONITOR_PARADO_MIN;
  if (!caiu && !monitorParado) return null;

  return (
    <div
      role="alert"
      className={
        "sticky top-3 z-40 mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl " +
        (caiu
          ? "border-red-500/40 bg-[#2b1115] text-red-100"
          : "border-yellow-500/40 bg-[#2a2310] text-yellow-100")
      }
    >
      <Icon as={Danger} size={20} className={caiu ? "mt-0.5 shrink-0 text-red-400" : "mt-0.5 shrink-0 text-yellow-400"} />
      <div className="min-w-0 text-sm">
        {caiu ? (
          <>
            <p className="font-bold">WhatsApp desconectado desde {formatar(data.since)}</p>
            <p className="text-red-100/80">
              Os relatórios diários, os alertas financeiros e as cobranças aos clientes não estão sendo enviados.
              Reconecte a instância <b>agencia03</b> lendo o QR code.
            </p>
            {data.detail && <p className="mt-0.5 text-xs text-red-100/50">{data.detail}</p>}
          </>
        ) : (
          <>
            <p className="font-bold">O monitor do WhatsApp parou de atualizar</p>
            <p className="text-yellow-100/80">
              Última checagem em {formatar(data.checked_at)}. Não dá para garantir que o WhatsApp está conectado.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
