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
    if (prop.type === 'date' && prop.date?.start) return prop.date.start
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const notionToken = Deno.env.get('NOTION_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!notionToken) {
      return new Response(
        JSON.stringify({ connected: false, tasks: [], message: 'NOTION_TOKEN não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey)

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

    // Se veio um POST com database_id, salvar configuração
    if (req.method === 'POST') {
      const body = await req.json()
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

    // Buscar páginas do banco Notion
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
        page_size: 50,
      }),
    })

    const notionData = await notionRes.json()

    if (notionData.object === 'error') {
      throw new Error(notionData.message)
    }

    const tasks = (notionData.results ?? []).map((page: any) => ({
      id: page.id,
      title: extractTitle(page.properties),
      status: extractStatus(page.properties),
      dueDate: extractDate(page.properties),
      priority: extractPriority(page.properties),
      url: page.url,
      lastEdited: page.last_edited_time,
    }))

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
