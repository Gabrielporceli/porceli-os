/**
 * whatsapp-health — checa a conexão da instância do WhatsApp (Evolution) e
 * grava o estado em `whatsapp_status`, que o CRM mostra como banner.
 *
 * Roda a cada 2 minutos (pg_cron). Só marca "down" depois de 2 checagens
 * seguidas falhando, pra não alarmar com oscilação de segundos.
 *
 * Por que existe: as outras funções (daily-summary, financial-alert…)
 * respondem "sucesso" mesmo quando a Evolution recusa o envio, então uma
 * instância desconectada derrubava relatório e cobrança sem ninguém saber.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const INSTANCE = "agencia03"
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.gabrielporceli.com.br"
// Mesma chave das funções de envio (daily-summary, financial-alert): o segredo EVOLUTION_API_KEY do projeto tem outro valor e devolve 401.
const EVOLUTION_API_KEY = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
const FALHAS_PARA_ALERTAR = 2

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
)

async function lerConexao(): Promise<{ aberta: boolean; detalhe: string }> {
  const headers = { apikey: EVOLUTION_API_KEY }
  try {
    const r = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return { aberta: false, detalhe: `API da Evolution respondeu ${r.status}` }

    const estado = (await r.json())?.instance?.state
    if (estado === "open") return { aberta: true, detalhe: "open" }

    let detalhe = `estado: ${estado ?? "desconhecido"}`
    try {
      const i = await fetch(`${EVOLUTION_URL}/instance/fetchInstances?instanceName=${INSTANCE}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      })
      const lista = await i.json()
      const inst = (Array.isArray(lista) ? lista[0] : lista)?.instance ?? (Array.isArray(lista) ? lista[0] : lista)
      const tipo = inst?.disconnectionObject
        ? (() => { try { return JSON.parse(inst.disconnectionObject)?.error?.data?.attrs?.type } catch { return null } })()
        : null
      if (inst?.disconnectionReasonCode) {
        detalhe += ` (código ${inst.disconnectionReasonCode}${tipo ? `, ${tipo}` : ""})`
      }
    } catch { /* o motivo é só um extra */ }
    return { aberta: false, detalhe }
  } catch (e) {
    return { aberta: false, detalhe: `Evolution fora do ar: ${(e as Error).message}` }
  }
}

serve(async () => {
  try {
    const { aberta, detalhe } = await lerConexao()
    const agora = new Date().toISOString()

    const { data: atual } = await supabase
      .from("whatsapp_status")
      .select("state, fail_count, since")
      .eq("instance", INSTANCE)
      .maybeSingle()

    let state = atual?.state ?? "open"
    let fail_count = atual?.fail_count ?? 0
    let since = atual?.since ?? agora

    if (aberta) {
      if (state !== "open") since = agora
      state = "open"
      fail_count = 0
    } else {
      fail_count += 1
      if (state !== "down" && fail_count >= FALHAS_PARA_ALERTAR) {
        state = "down"
        since = agora
      }
    }

    await supabase.from("whatsapp_status").upsert({
      instance: INSTANCE,
      state,
      fail_count,
      since,
      checked_at: agora,
      detail: detalhe,
    })

    return new Response(JSON.stringify({ state, fail_count, detalhe }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
