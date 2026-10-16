import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const EVOLUTION_URL      = Deno.env.get('EVOLUTION_API_URL') || "https://api.gabrielporceli.com.br"
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY') || "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || "agencia03"
const GROUP_JID          = Deno.env.get('ASAAS_ADMIN_GROUP_JID') || "120363162167738258@g.us"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const FONTE = "task-reminder"

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

serve(async (req) => {
  try {
    // 1. Janela de 9 a 11 minutos a partir de agora. Cada evento cai em duas
    // execuções seguidas (de propósito: se uma rodada for pulada, a outra
    // pega) — a dedupe_key por evento garante um lembrete só.
    const now = new Date()
    const startTimeStr = new Date(now.getTime() + 9 * 60000).toISOString()
    const endTimeStr = new Date(now.getTime() + 11 * 60000).toISOString()

    console.log(`Verificando tarefas entre ${startTimeStr} e ${endTimeStr}...`)

    // 2. Buscar Eventos do Calendário que começam nessa janela
    const { data: events } = await supabase
      .from('google_calendar_events')
      .select('title, start_time, all_day')
      .gte('start_time', startTimeStr)
      .lt('start_time', endTimeStr)
      .eq('all_day', false)

    // 3. Buscar Tarefas do Notion com horário
    const { data: tasks } = await supabase
      .from('notion_tasks')
      .select('title, due_date')
      .gte('due_date', startTimeStr)
      .lt('due_date', endTimeStr)
      .neq('status', 'Concluído')

    let notificationsSent = 0

    // 4. Disparar notificações de Calendário
    if (events && events.length > 0) {
      for (const event of events) {
        const d = new Date(event.start_time);
        const isMidnightUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
        const isMidnightBR = d.getUTCHours() === 3 && d.getUTCMinutes() === 0;
        
        if (isMidnightUTC || isMidnightBR) {
          console.log(`Ignorando evento ${event.title} pois está marcado para as 00:00`)
          continue;
        }

        const text = `*LEMBRETE (Calendario)*\n\nSua reuniao: *${event.title}*\nComeca em *10 minutos!*`
        const fila = await enfileirarWhatsApp(GROUP_JID, text, {
          dedupe: `lembrete:cal:${event.title}:${event.start_time}`,
          expiresAt: event.start_time, // se não sair até a reunião começar, não serve mais
        })
        if (!fila.ok) throw new Error(fila.error)
        if (fila.id) notificationsSent++
      }
    }

    // 5. Disparar notificações do Notion
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const d = new Date(task.due_date);
        const isMidnightUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
        const isMidnightBR = d.getUTCHours() === 3 && d.getUTCMinutes() === 0;
        
        if (isMidnightUTC || isMidnightBR) {
          console.log(`Ignorando tarefa ${task.title} pois está marcada para as 00:00`)
          continue;
        }

        const text = `*LEMBRETE (Notion)*\n\nSua tarefa: *${task.title}*\nO prazo comeca em *10 minutos!*`
        const fila = await enfileirarWhatsApp(GROUP_JID, text, {
          dedupe: `lembrete:notion:${task.title}:${task.due_date}`,
          expiresAt: task.due_date,
        })
        if (!fila.ok) throw new Error(fila.error)
        if (fila.id) notificationsSent++
      }
    }

    if (notificationsSent > 0) {
      await supabase
        .from('automations')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('jobname', 'vigilante-tarefas-10min')
    }

    return new Response(JSON.stringify({
      success: true,
      notifications: notificationsSent,
      timestamp: new Date().toISOString()
    }), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

