import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function buildCronCommand(functionName: string): string {
  return `SELECT net.http_post(url := '${SUPABASE_URL}/functions/v1/${functionName}', headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${SERVICE_ROLE_KEY}"}'::jsonb) as request_id;`
}

function cronToHumanBRT(cron: string): string {
  if (cron === '* * * * *') return 'A cada minuto'
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return cron
  const minute = parseInt(parts[0])
  const hourUTC = parseInt(parts[1])
  if (isNaN(minute) || isNaN(hourUTC)) return cron
  const hourBRT = ((hourUTC - 3) + 24) % 24
  return `Todo dia às ${String(hourBRT).padStart(2, '0')}:${String(minute).padStart(2, '0')} (Horário de Brasília)`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const url = new URL(req.url)
    const method = req.method

    // GET — listar automações com status real do cron
    if (method === 'GET') {
      const [{ data: automations }, { data: cronJobs }] = await Promise.all([
        supabase.from('automations').select('*').order('category').order('display_name'),
        supabase.from('cron.job').select('jobname, schedule, active').catch(() => ({ data: [] })),
      ])

      // Verificar via cron.job via SQL direto (cron schema não é acessível pelo JS client)
      const { data: cronData } = await supabase.rpc('get_cron_jobs_status')
        .catch(() => ({ data: null }))

      const cronMap: Record<string, { active: boolean; schedule: string }> = {}
      if (cronData && Array.isArray(cronData)) {
        for (const job of cronData) {
          cronMap[job.jobname] = { active: job.active, schedule: job.schedule }
        }
      }

      const result = (automations ?? []).map((a: any) => ({
        ...a,
        is_scheduled: cronMap[a.jobname]?.active ?? a.enabled,
        schedule_human: cronToHumanBRT(a.schedule),
      }))

      return new Response(JSON.stringify({ automations: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST — ações: toggle, update_schedule, trigger
    if (method === 'POST') {
      const body = await req.json()
      const { action, id, enabled, schedule, jobname, function_name } = body

      if (action === 'toggle') {
        // Buscar automação
        const { data: automation } = await supabase
          .from('automations')
          .select('*')
          .eq('id', id)
          .single()

        if (!automation) throw new Error('Automação não encontrada')

        if (enabled) {
          // Reagendar cron
          const command = buildCronCommand(automation.function_name)
          await supabase.rpc('manage_automation_cron', {
            p_action: 'schedule',
            p_jobname: automation.jobname,
            p_schedule: automation.schedule,
            p_command: command,
          })
        } else {
          // Remover do cron
          await supabase.rpc('manage_automation_cron', {
            p_action: 'unschedule',
            p_jobname: automation.jobname,
          })
        }

        // Atualizar tabela
        await supabase
          .from('automations')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', id)

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'update_schedule') {
        const { data: automation } = await supabase
          .from('automations')
          .select('*')
          .eq('id', id)
          .single()

        if (!automation) throw new Error('Automação não encontrada')

        // Atualizar cron se habilitado
        if (automation.enabled) {
          const command = buildCronCommand(automation.function_name)
          await supabase.rpc('manage_automation_cron', {
            p_action: 'schedule',
            p_jobname: automation.jobname,
            p_schedule: schedule,
            p_command: command,
          })
        }

        await supabase
          .from('automations')
          .update({ schedule, updated_at: new Date().toISOString() })
          .eq('id', id)

        return new Response(JSON.stringify({ success: true, schedule_human: cronToHumanBRT(schedule) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'trigger') {
        const { data: automation } = await supabase
          .from('automations')
          .select('*')
          .eq('id', id)
          .single()

        if (!automation) throw new Error('Automação não encontrada')

        // Chamar a função diretamente
        const fnResponse = await fetch(`${SUPABASE_URL}/functions/v1/${automation.function_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({}),
        })

        const fnResult = await fnResponse.text()

        // Atualizar last_triggered_at
        await supabase
          .from('automations')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', id)

        return new Response(JSON.stringify({
          success: fnResponse.ok,
          status: fnResponse.status,
          result: fnResult.substring(0, 500),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      throw new Error(`Ação desconhecida: ${action}`)
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error: unknown) {
    const err = error as Error
    console.error('Erro manage-automations:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
