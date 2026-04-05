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
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Buscar Eventos do Calendário de Hoje
    const { data: events, error: eventsError } = await supabase
      .from('google_calendar_events')
      .select('title, start_time')
      .gte('start_time', `${today}T00:00:00Z`)
      .lte('start_time', `${today}T23:59:59Z`)

    // 2. Buscar Tarefas do Notion de Hoje
    const { data: tasks, error: tasksError } = await supabase
      .from('notion_tasks')
      .select('title, status')
      .gte('due_date', `${today}T00:00:00Z`)
      .lte('due_date', `${today}T23:59:59Z`)
      .neq('status', 'Concluído') // Apenas o que falta fazer

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
        message += `• ${t.title} [${t.status}]\n`
      })
    } else {
      message += `📝 *NOTION:* Sem tarefas pendentes para hoje.`
    }

    // 4. Enviar para o WhatsApp via Evolution API
    const response = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: GROUP_JID,
        text: message
      })
    })

    const result = await response.json()
    console.log("Mensagem enviada com sucesso:", result)

    return new Response(JSON.stringify({ success: true, message: "Resumo enviado!" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
