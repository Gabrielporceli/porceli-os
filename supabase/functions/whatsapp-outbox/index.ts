/**
 * whatsapp-outbox — o ÚNICO lugar que envia WhatsApp automático pela Evolution.
 *
 * As outras funções (alertas, relatórios, lembretes, avisos de contrato…) só
 * colocam a mensagem em `whatsapp_outbox`. Este worker roda a cada minuto e:
 *   • não envia nada se o WhatsApp está desconectado (whatsapp_status = down) —
 *     as mensagens esperam e saem quando reconectar;
 *   • reserva um lote (outbox_claim, FOR UPDATE SKIP LOCKED — duas execuções
 *     nunca pegam a mesma mensagem);
 *   • envia uma por vez com intervalo aleatório (ritmo humano, evita bloqueio);
 *   • falhou → tenta de novo com espera crescente (outbox_finish); esgotou →
 *     'failed', que aparece no aviso de falhas do CRM.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EVO_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.gabrielporceli.com.br"
const EVO_INSTANCE = "agencia03"
// Mesma chave fixa das outras funções (o secret EVOLUTION_API_KEY do projeto devolve 401).
const EVO_KEY = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"

// Por execução (1/min): no máximo LOTE mensagens, ~3–6s entre elas → cabe com
// folga no limite de tempo da função e dá no máximo ~12 mensagens/minuto.
const LOTE = 12
const INTERVALO_MIN_MS = 3000
const INTERVALO_MAX_MS = 6000

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

async function enviar(number: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => "")
      return { ok: false, error: `Evolution ${r.status}: ${txt.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

serve(async () => {
  try {
    const { data: st } = await supabase
      .from("whatsapp_status").select("state").eq("instance", EVO_INSTANCE).maybeSingle()
    if (st?.state === "down") {
      return json({ success: true, enviadas: 0, motivo: "WhatsApp desconectado — fila aguardando" })
    }

    const { data: lote, error } = await supabase.rpc("outbox_claim", { p_limit: LOTE })
    if (error) return json({ success: false, error: `outbox_claim: ${error.message}` }, 500)
    const msgs = (lote ?? []) as { id: string; number: string; text: string }[]

    let enviadas = 0, falhas = 0
    for (const [i, m] of msgs.entries()) {
      if (i > 0) {
        const espera = INTERVALO_MIN_MS + Math.random() * (INTERVALO_MAX_MS - INTERVALO_MIN_MS)
        await new Promise((r) => setTimeout(r, espera))
      }
      const res = await enviar(m.number, m.text)
      const { error: fe } = await supabase.rpc("outbox_finish", { p_id: m.id, p_ok: res.ok, p_error: res.error ?? null })
      if (fe) console.error("outbox_finish:", fe.message)
      if (res.ok) enviadas++
      else { falhas++; console.warn(`falha ${m.id}:`, res.error) }
    }

    // success:false quando NADA saiu de um lote com mensagens → o monitor de crons acusa
    return json({ success: msgs.length === 0 || enviadas > 0, enviadas, falhas, lote: msgs.length })
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500)
  }
})
