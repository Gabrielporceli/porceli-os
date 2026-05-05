import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractTitle(properties: any): string {
  for (const key of Object.keys(properties)) {
    const prop = properties[key]
    if (prop.type === 'title' && prop.title?.length > 0) {
      return prop.title.map((t: any) => t.plain_text).join('')
    }
  }
  return '(Sem título)'
}

function extractStatus(properties: any): string | null {
  for (const key of Object.keys(properties)) {
    const prop = properties[key]
    if (prop.type === 'status') return prop.status?.name ?? null
    if (prop.type === 'select') return prop.select?.name ?? null
  }
  return null
}

function extractDate(properties: any): string | null {
  for (const key of Object.keys(properties)) {
    const prop = properties[key]
    if (prop.type === 'date' && prop.date?.start) {
      return prop.date.start
    }
  }
  return null
}

function extractTime(properties: any): string | null {
  // 1. Procurar em propriedades específicas de data que possam ter o tempo embutido
  for (const key of Object.keys(properties)) {
    const prop = properties[key]
    if (prop.type === 'date' && prop.date?.start && prop.date.start.includes('T')) {
      return prop.date.start.split('T')[1].substring(0, 5)
    }
  }

  // 2. Procurar por propriedades com nomes comuns de hora
  const timeKeys = ['Hora', 'Time', 'Horário', 'Horario', 'When']
  for (const key of timeKeys) {
    const prop = properties[key]
    if (!prop) continue
    
    if (prop.type === 'rich_text' && prop.rich_text?.length > 0) {
      return prop.rich_text[0].plain_text
    }
    if (prop.type === 'title' && prop.title?.length > 0) {
      return prop.title[0].plain_text
    }
    if (prop.type === 'select' && prop.select) {
      return prop.select.name
    }
  }

  // 3. Busca exaustiva por qualquer campo que pareça uma hora (HH:mm)
  for (const key of Object.keys(properties)) {
    const prop = properties[key]
    let text = ''
    if (prop.type === 'rich_text' && prop.rich_text?.length > 0) text = prop.rich_text[0].plain_text
    else if (prop.type === 'select' && prop.select) text = prop.select.name
    
    if (text && /^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return text
  }

  return null
}

function extractPriority(properties: any): string | null {
  for (const key of ['Prioridade', 'Priority', 'Urgência', 'Urgencia']) {
    const prop = properties[key]
    if (prop?.type === 'select') return prop.select?.name ?? null
  }
  return null
}

function extractClients(properties: any): string[] {
  for (const key of ['Clientes', 'Cliente', 'Clients', 'Client', 'Projeto', 'Project', 'Empresa', 'Company', 'Marca', 'Tags']) {
    const prop = properties[key]
    if (prop?.type === 'multi_select') return prop.multi_select.map((s: any) => s.name)
    if (prop?.type === 'relation') return prop.relation.map((r: any) => r.id) // IDs resolvidos depois
    if (prop?.type === 'select' && prop.select) return [prop.select.name]
    if (prop?.type === 'rich_text' && prop.rich_text?.length > 0) return [prop.rich_text[0].plain_text]
  }
  return []
}

// Resolve IDs de relation para títulos reais via API do Notion
async function resolveRelationTitles(ids: string[], notionToken: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(ids.map(async (id) => {
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
        }
      })
      const page = await res.json()
      if (page.object !== 'error') {
        map.set(id, extractTitle(page.properties))
      }
    } catch (_) { /* ignora falhas individuais */ }
  }))
  return map
}

function extractRecurrence(properties: any): string | null {
  for (const key of ['Recorrência', 'Recorrencia', 'Recurrence', 'Repetição']) {
    const prop = properties[key]
    if (prop?.type === 'select') return prop.select?.name ?? null
    if (prop?.type === 'rich_text' && prop.rich_text?.length > 0) return prop.rich_text[0].plain_text
  }
  return null
}

function extractResponsible(properties: any): string[] {
  for (const key of ['Responsável', 'Responsavel', 'Responsible', 'Assignee']) {
    const prop = properties[key]
    if (prop?.type === 'people') return prop.people.map((p: any) => p.name || p.id)
    if (prop?.type === 'multi_select') return prop.multi_select.map((s: any) => s.name)
  }
  return []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminSupabase = createClient(supabaseUrl, serviceKey)

    // Identificar o usuário pelo JWT no header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Buscar o token do Notion para este usuário
    const { data: notionTokenRecord } = await adminSupabase
      .from('notion_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .maybeSingle()

    const notionToken = notionTokenRecord?.access_token

    if (!notionToken) {
      return new Response(
        JSON.stringify({ connected: false, tasks: [], message: 'Notion não conectado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar database_id configurado
    const url = new URL(req.url)
    let databaseId = url.searchParams.get('database_id')

    if (!databaseId) {
      const { data: config } = await adminSupabase
        .from('notion_config')
        .select('database_id')
        .single()
      databaseId = config?.database_id
    }

    // Se veio um POST com database_id ou ação
    if (req.method === 'POST') {
      const body = await req.json()
      
      // Ação de criar tarefa
      if (body.action === 'CREATE_TASK') {
        try {
          const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: {
              'Authorization': `Bearer ${notionToken}`,
              'Notion-Version': '2022-06-28',
            }
          })
          const dbDetails = await dbRes.json()
          if (dbDetails.object === 'error') throw new Error(dbDetails.message)

          const properties: any = {}
          const dbProps = dbDetails.properties

          // Título
          const titleKey = Object.keys(dbProps).find(k => dbProps[k].type === 'title')
          if (titleKey) properties[titleKey] = { title: [{ text: { content: body.title } }] }

          // Data
          const dateKey = Object.keys(dbProps).find(k => dbProps[k].type === 'date')
          if (dateKey && body.dueDate) properties[dateKey] = { date: { start: body.dueDate } }

          // Cliente
          if (body.client) {
            const clientKey = Object.keys(dbProps).find(k => 
              ['Clientes', 'Cliente', 'Clients', 'Client', 'Projeto', 'Project', 'Empresa', 'Company', 'Marca', 'Tags'].includes(k)
            )
            if (clientKey) {
              const type = dbProps[clientKey].type
              if (type === 'multi_select') properties[clientKey] = { multi_select: [{ name: body.client }] }
              else if (type === 'select') properties[clientKey] = { select: { name: body.client } }
              else if (type === 'rich_text') properties[clientKey] = { rich_text: [{ text: { content: body.client } }] }
            }
          }

          // Recorrência
          if (body.recurrence) {
            const recKey = Object.keys(dbProps).find(k => 
              ['Recorrência', 'Recorrencia', 'Recurrence', 'Repetição'].includes(k)
            )
            if (recKey) {
              const type = dbProps[recKey].type
              if (type === 'select') properties[recKey] = { select: { name: body.recurrence } }
              else if (type === 'rich_text') properties[recKey] = { rich_text: [{ text: { content: body.recurrence } }] }
            }
          }

          const createRes = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parent: { database_id: databaseId },
              properties
            })
          })
          const createData = await createRes.json()
          if (createData.object === 'error') throw new Error(createData.message)

          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Ação de atualizar tarefa
      if (body.action === 'UPDATE_TASK' && body.task_id) {
        let updateRes;
        
        try {
          // Busca a pagina primeiro pra descobrir nomes e tipos de colunas de status e data
          const pageRes = await fetch(`https://api.notion.com/v1/pages/${body.task_id}`, {
            headers: {
              'Authorization': `Bearer ${notionToken}`,
              'Notion-Version': '2022-06-28',
            }
          })
          const page = await pageRes.json()
          if (page.object === 'error') throw new Error(page.message)
          
          const updates: any = {}
          
          // Atualiza status
          if (body.status !== undefined) {
             let statusPropName = null
             let isStatusType = false
             for (const [key, prop] of Object.entries<any>(page.properties)) {
                if (prop.type === 'status') { statusPropName = key; isStatusType = true; break; }
                if (prop.type === 'select' && !statusPropName) { statusPropName = key; }
             }
             if (statusPropName) {
                if (isStatusType) {
                   updates[statusPropName] = { status: { name: body.status } }
                } else {
                   updates[statusPropName] = { select: { name: body.status } }
                }
             }
          }
          
          // Atualiza Título
          if (body.title !== undefined) {
             let titlePropName = null
             for (const [key, prop] of Object.entries<any>(page.properties)) {
                if (prop.type === 'title') { titlePropName = key; break; }
             }
             if (titlePropName) {
                updates[titlePropName] = { title: [{ text: { content: body.title } }] }
             }
          }
          
          // Atualiza dueDate (jogar pra outro dia)
          if (body.dueDate !== undefined) {
             let datePropName = null
             for (const [key, prop] of Object.entries<any>(page.properties)) {
                if (prop.type === 'date') { datePropName = key; break; }
             }
             if (datePropName) {
                updates[datePropName] = { date: body.dueDate ? { start: body.dueDate } : null }
             }
          }
          
          Object.keys(updates).length > 0 && console.log("Atualizando Notion:", body.task_id, updates);
          
          if (Object.keys(updates).length > 0) {
            updateRes = await fetch(`https://api.notion.com/v1/pages/${body.task_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: updates })
            })
            
            const updateData = await updateRes.json()
            if (updateData.object === 'error') throw new Error(updateData.message)
          }
          
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      
      // Ação de excluir tarefa (arquivar)
      if (body.action === 'DELETE_TASK' && body.task_id) {
        try {
          const deleteRes = await fetch(`https://api.notion.com/v1/pages/${body.task_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${notionToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ archived: true })
          })
          
          const deleteData = await deleteRes.json()
          if (deleteData.object === 'error') throw new Error(deleteData.message)
          
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      
      // Ação de configurar database
      if (body.database_id) {
        await adminSupabase
          .from('notion_config')
          .upsert({ database_id: body.database_id, database_name: body.database_name })
        databaseId = body.database_id
      }
    }

    if (!databaseId) {
      return new Response(
        JSON.stringify({ connected: true, tasks: [], message: 'database_id não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar páginas do banco Notion — busca todas as páginas com paginação
    // Filtra por data: mês atual ± 2 meses para garantir que todas as tarefas visíveis apareçam
    const now = new Date()
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    const dateFrom = twoMonthsAgo.toISOString().split('T')[0]
    const dateTo = twoMonthsAhead.toISOString().split('T')[0]

    let allResults: any[] = []
    let hasMore = true
    let startCursor: string | undefined = undefined

    while (hasMore) {
      const body: any = {
        sorts: [{ property: 'Dia', direction: 'ascending' }],
        filter: {
          and: [
            {
              property: 'Dia',
              date: { on_or_after: dateFrom }
            },
            {
              property: 'Dia',
              date: { on_or_before: dateTo }
            }
          ]
        },
        page_size: 100,
      }
      if (startCursor) body.start_cursor = startCursor

      const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const notionData = await notionRes.json()

      if (notionData.object === 'error') {
        throw new Error(notionData.message)
      }

      allResults = allResults.concat(notionData.results ?? [])
      hasMore = notionData.has_more ?? false
      startCursor = notionData.next_cursor ?? undefined
    }

    // Extrai clients de cada página (pode conter IDs de relation)
    const rawTaskClients = allResults.map((page: any) => extractClients(page.properties))

    // Coleta IDs únicos que parecem UUIDs (relation) para resolver
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const relationIds = [...new Set(rawTaskClients.flat().filter(c => uuidRe.test(c)))]
    const relationTitleMap = relationIds.length > 0
      ? await resolveRelationTitles(relationIds, notionToken)
      : new Map<string, string>()

    const tasks = allResults.map((page: any, i: number) => {
      const dueDate = extractDate(page.properties)
      const time = extractTime(page.properties)
      const clients = rawTaskClients[i].map(c => relationTitleMap.get(c) ?? c)
      return {
        id: page.id,
        title: extractTitle(page.properties),
        status: extractStatus(page.properties),
        dueDate,
        time,
        priority: extractPriority(page.properties),
        clients,
        recurrence: extractRecurrence(page.properties),
        responsible: extractResponsible(page.properties),
        url: page.url,
        lastEdited: page.last_edited_time,
      }
    })

    // Sincronizar com o banco de dados interno
    const tasksToUpsert = tasks.map(t => ({
      notion_page_id: t.id,
      title: t.title,
      status: t.status,
      due_date: (() => {
        if (!t.dueDate) return null
        if (t.dueDate.includes('T')) {
          // datetime com timezone (-03:00, +00:00, Z) → usa direto; sem timezone → assume Brasil
          const hasTimezone = /([+-]\d{2}:\d{2}|Z)$/.test(t.dueDate)
          return hasTimezone ? t.dueDate : `${t.dueDate}-03:00`
        }
        // só data: appenda horário com timezone Brasil
        if (t.time) return `${t.dueDate}T${t.time}:00-03:00`
        return `${t.dueDate}T00:00:00Z`
      })(),
      priority: t.priority,
      url: t.url,
      synced_at: new Date().toISOString()
    })).filter(t => t.due_date !== null) // Apenas tarefas com data interessam ao lembrete

    if (tasksToUpsert.length > 0) {
      const { error: upsertError } = await adminSupabase
        .from('notion_tasks')
        .upsert(tasksToUpsert, { onConflict: 'notion_page_id' })
      
      if (upsertError) console.error("Erro ao sincronizar Notion tasks:", upsertError.message)
    }

    return new Response(
      JSON.stringify({ connected: true, tasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
