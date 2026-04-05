import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const EVOLUTION_URL = "https://api.gabrielporceli.com.br"
const EVOLUTION_API_KEY = "2C2B8ACDE0FB-44EA-BD01-59E39E4A9E76"
const EVOLUTION_INSTANCE = "agencia02"
const GROUP_JID = "120363162167738258@g.us"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // 0. Sincronizar o Notion agora para garantir que temos as tarefas mais recentes
    console.log("Forçando sincronismo com o Notion antes de checar alertas...")
    await fetch(`${SUPABASE_URL}/functions/v1/notion-tasks`, {
      headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    }).catch(e => console.error("Erro no sincronismo pré-alerta:", e.message))

    // 1. Calcular a janela de 10 minutos a partir de agora
    const now = new Date()
    const targetTime = new Date(now.getTime() + 10 * 60000) // Agora + 10 min
    
    // Criamos uma janela de 1 minuto para garantir o disparo
    const startTimeStr = targetTime.toISOString()
    const endTimeStr = new Date(targetTime.getTime() + 60000).toISOString()

    console.log(`Verificando tarefas entre ${startTimeStr} e ${endTimeStr}...`)

    // 2. Buscar Eventos do Calendário que começam nessa janela
    const { data: events } = await supabase
      .from('google_calendar_events')
      .select('title, start_time')
      .gte('start_time', startTimeStr)
      .lt('start_time', endTimeStr)

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
        const text = `⏳ *LEMBRETE (Calendário)*\n\nSua reunião: *${event.title}*\nComeça em *10 minutos!*`
        await sendWhatsApp(text)
        notificationsSent++
      }
    }

    // 5. Disparar notificações do Notion
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const text = `⏳ *LEMBRETE (Notion)*\n\nSua tarefa: *${task.title}*\nO prazo vence em *10 minutos!*`
        await sendWhatsApp(text)
        notificationsSent++
      }
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

async function sendWhatsApp(text: string) {
  return fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
    body: JSON.stringify({ number: GROUP_JID, text: text })
  })
}
