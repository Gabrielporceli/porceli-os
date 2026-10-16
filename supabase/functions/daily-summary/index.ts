import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const EVOLUTION_URL             = Deno.env.get('EVOLUTION_API_URL') || "https://api.gabrielporceli.com.br"
const EVOLUTION_API_KEY         = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
const EVOLUTION_INSTANCE        = "agencia03"
const GROUP_JID                 = Deno.env.get('ASAAS_ADMIN_GROUP_JID') || "120363162167738258@g.us"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const FONTE = "daily-summary"

// ── Fila única de WhatsApp ─────────────────────────────────────────────────
// Esta função NÃO fala com a Evolution: só coloca a mensagem em
// whatsapp_outbox, e o worker whatsapp-outbox envia (com intervalo, retentativa
// e segurando enquanto o WhatsApp estiver desconectado). A dedupe_key padrão —
// origem + número + texto + dia — faz uma retentativa do cron (ou uma chamada
// repetida) nunca duplicar a mesma mensagem.
const outboxDb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

async function hashCurto(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(b)).slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join("")
}

async function enfileirarWhatsApp(
  number: string,
  text: string,
  opts: { dedupe?: string; refTable?: string; refId?: string; expiresAt?: string } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const dedupe = opts.dedupe ?? `${FONTE}:${number}:${await hashCurto(text)}:${new Date().toISOString().slice(0, 10)}`
  const { data, error } = await outboxDb
    .from("whatsapp_outbox")
    .upsert(
      { number, text, source: FONTE, dedupe_key: dedupe, ref_table: opts.refTable ?? null, ref_id: opts.refId ?? null, expires_at: opts.expiresAt ?? null },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle()
  if (error) return { ok: false, error: `fila: ${error.message}` }
  return { ok: true, id: (data as { id?: string } | null)?.id }
}

function statusDot(status: string): string {
  if (status === 'Realizado')    return '🟢'
  if (status === 'Em andamento') return '🔵'
  return '🔴'
}

serve(async (req) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. Buscar Eventos do Calendário de Hoje
    const { data: events } = await supabase
      .from('google_calendar_events')
      .select('title, start_time')
      .gte('start_time', `${today}T00:00:00Z`)
      .lte('start_time', `${today}T23:59:59Z`)

    // 2. Buscar Tarefas do Notion de Hoje
    const { data: tasks } = await supabase
      .from('notion_tasks')
      .select('title, status, properties')
      .gte('due_date', `${today}T00:00:00Z`)
      .lte('due_date', `${today}T23:59:59Z`)
      .neq('status', 'Concluído')

    // 3. Montar a Mensagem
    let message = `🚀 *ATIVIDADES DO DIA - ${new Date().toLocaleDateString('pt-BR')}*\n\n`

    if (events && events.length > 0) {
      message += `📅 *CALENDÁRIO:*\n`
      events.forEach(e => {
        const time = new Date(e.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        message += `• ${time} - ${e.title}\n`
      })
      message += `\n`
    } else {
      message += `📅 *CALENDÁRIO:* Nenhuma reunião agendada.\n\n`
    }

    if (tasks && tasks.length > 0) {
      message += `📝 *NOTION (Pendentes):*\n`
      tasks.forEach(t => {
        // Quando a tarefa tem cliente, mostra "Tarefa - Cliente" em vez do status.
        // O status já é indicado pela bolinha colorida (🔴/🔵/🟢).
        const clients: string[] = Array.isArray((t as any).properties?.clients)
          ? (t as any).properties.clients
          : []
        const suffix = clients.length > 0 ? ` - ${clients.join(', ')}` : ''
        message += `${statusDot(t.status)} ${t.title}${suffix}\n`
      })
    } else {
      message += `📝 *NOTION:* Sem tarefas pendentes para hoje.`
    }

    // 4. Enfileirar para o WhatsApp (o worker whatsapp-outbox envia)
    const fila = await enfileirarWhatsApp(GROUP_JID, message)
    if (!fila.ok) throw new Error(fila.error)

    await supabase
      .from('automations')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('jobname', 'resumo-diario-whatsapp')

    return new Response(JSON.stringify({ success: true, message: "Resumo na fila de envio" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
