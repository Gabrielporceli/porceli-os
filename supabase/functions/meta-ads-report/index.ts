import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EVOLUTION_URL = (Deno.env.get('EVOLUTION_URL') || 'https://api.gabrielporceli.com.br').trim()
const EVOLUTION_API_KEY = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
const EVOLUTION_INSTANCE = "agencia03"
const META_GRAPH_VERSION = 'v24.0'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBRL(num: number): string {
  return Number(num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getActionCount(actions: any[] = [], types: string[]): number {
  for (const t of types) {
    const found = actions.find(a => String(a.action_type).toLowerCase() === t.toLowerCase())
    if (found) return Number(found.value || 0)
  }
  return 0
}

function getActionValue(actionValues: any[] = [], types: string[]): number {
  for (const t of types) {
    const found = actionValues?.find(a => String(a.action_type).toLowerCase() === t.toLowerCase())
    if (found) return Number(found.value || 0)
  }
  return 0
}

const PURCHASE_TYPES = [
  'offsite_conversion.fb_pixel_purchase', 'purchase',
  'onsite_conversion.purchase', 'onsite_web_purchase',
  'omni_purchase', 'website_purchase',
]

const PIXEL_EVENT_LABELS: Record<string, string> = {
  PageView: 'Visualizações de Página',
  ViewContent: 'Visualizações de Conteúdo',
  AddToCart: 'Adições ao Carrinho',
  AddPaymentInfo: 'Informações de Pagamento Inseridas',
  Lead: 'Cadastros / Leads',
  InitiateCheckout: 'Inícios de Checkout',
  Purchase: 'Compras',
  Search: 'Pesquisas no Site',
  Contact: 'Contatos Realizados',
  CompleteRegistration: 'Cadastros Concluídos',
  Subscribe: 'Assinaturas Realizadas',
}

// ─── Cálculo de data (porta fiel do n8n Code in JavaScript5) ──────────────────

function calculateDateRange(timezoneOffset: number) {
  const nowUTC = new Date()
  const nowLocal = new Date(nowUTC.getTime() + timezoneOffset * 60 * 60 * 1000)

  const yesterday = new Date(
    nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate() - 1, 0, 0, 0, 0
  )

  const y = yesterday.getFullYear()
  const m = String(yesterday.getMonth() + 1).padStart(2, '0')
  const d = String(yesterday.getDate()).padStart(2, '0')

  const since = `${y}-${m}-${d}`

  const startUTCms = Date.UTC(y, yesterday.getMonth(), yesterday.getDate(), -timezoneOffset, 0, 0, 0)
  const endUTCms   = Date.UTC(y, yesterday.getMonth(), yesterday.getDate(), 23 - timezoneOffset, 59, 59, 999)

  return {
    since,
    until: since,
    formattedDate: `${d}-${m}-${y}`,
    startISO: new Date(startUTCms).toISOString(),
    endISO: new Date(endUTCms).toISOString(),
  }
}

// ─── Variáveis disponíveis para o template ────────────────────────────────────
// {{data}}              → DD/MM/AAAA
// {{campanha}}          → nome da campanha
// {{investimento}}      → R$ X,XX
// {{compras_diretas}}   → número inteiro
// {{custo_por_compra}}  → R$ X,XX (ou "—")
// {{retorno}}           → R$ X,XX (ou "—")
// {{roas}}              → X.XX (ou "—")
// {{compras_indiretas}} → número (ou "—")
// {{pixel_eventos}}     → lista formatada dos eventos do pixel
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `Bom dia, tudo bem?

📊 Relatório do Meta Ads - Dia {{data}}

Compras Diretas (viu o anúncio, clicou e comprou)

Campanha: {{campanha}}
Investimento: {{investimento}}
Compras Diretas: {{compras_diretas}}
Custo por Compra: {{custo_por_compra}}
Retorno (valor total das compras): {{retorno}}
ROAS: {{roas}}

Compras Indiretas: {{compras_indiretas}}

Totais do Pixel (todos os eventos)
{{pixel_eventos}}

⚠️ Importante lembrar: muitas pessoas veem o anúncio e compram pelo iFood por questão de segurança e cupons de desconto. Além disso, nosso foco principal é atrair novos compradores, acompanhe sempre essa métrica na Brendi e no iFood.`

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// ─── Geração da mensagem ───────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR')
}

function buildReportText(params: {
  campaignName: string
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpm: number
  cpc: number
  frequency: number
  actions: any[]
  actionValues: any[]
  pixelEvents: any[]
  formattedDate: string
  template?: string | null
}): string {
  const { campaignName, spend, impressions, reach, clicks, ctr, cpm, cpc, frequency, actions, actionValues, pixelEvents, formattedDate, template } = params

  // Formatar data DD-MM-AAAA → DD/MM/AAAA
  let dataFormatada = '—'
  const parts = (formattedDate || '').split('-')
  if (parts.length === 3 && parts[0].length === 2) {
    dataFormatada = `${parts[0]}/${parts[1]}/${parts[2]}`
  }

  // E-commerce
  const comprasDiretas = getActionCount(actions, PURCHASE_TYPES)
  const valorTotalCompras = getActionValue(actionValues, PURCHASE_TYPES)
  const custoCompraDireta = comprasDiretas && spend > 0 ? toBRL(spend / comprasDiretas) : '—'
  const retornoTotal = valorTotalCompras ? toBRL(valorTotalCompras) : '—'
  const roas = valorTotalCompras && spend > 0 ? (valorTotalCompras / spend).toFixed(2) : '—'
  const totalPurchasePixel = Number(pixelEvents.find(ev => ev.value === 'Purchase')?.count || 0)
  const comprasIndiretas = pixelEvents.length > 0 ? String(Math.max(0, totalPurchasePixel - comprasDiretas)) : '—'
  const pixelData = pixelEvents.length > 0
    ? pixelEvents.map(ev => `- ${PIXEL_EVENT_LABELS[ev.value] || ev.value}: ${ev.count}`).join('\n')
    : '—'

  // Lead form
  const leads = getActionCount(actions, ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped'])
  const custoLead = leads && spend > 0 ? toBRL(spend / leads) : '—'

  // Messaging
  const conversas = getActionCount(actions, ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply'])
  const custoMensagem = conversas && spend > 0 ? toBRL(spend / conversas) : '—'

  // Traffic
  const cliquesLink = getActionCount(actions, ['link_click'])
  const cpcLink = cliquesLink && spend > 0 ? toBRL(spend / cliquesLink) : '—'
  const visualizacoesPagina = getActionCount(actions, ['landing_page_view'])

  // Sem campanha ativa
  if (spend === 0 && pixelEvents.length === 0 && impressions === 0) {
    return `Bom dia! 🌟\n\n📊 Relatório Meta Ads — ${dataFormatada}\n\nNão houveram campanhas ativas neste dia.\n\nAssim que voltarmos a veicular anúncios, você voltará a receber os relatórios diários normalmente.`
  }

  const vars: Record<string, string> = {
    data: dataFormatada,
    campanha: campaignName,
    investimento: toBRL(spend),
    impressoes: fmtNum(impressions),
    alcance: fmtNum(reach),
    frequencia: frequency ? frequency.toFixed(1) : '—',
    cpm: cpm ? toBRL(cpm) : '—',
    cliques: fmtNum(clicks),
    ctr: ctr ? ctr.toFixed(2) : '—',
    cpc: cpc ? toBRL(cpc) : '—',
    // E-commerce
    compras_diretas: String(comprasDiretas),
    custo_por_compra: custoCompraDireta,
    retorno: retornoTotal,
    roas,
    compras_indiretas: comprasIndiretas,
    pixel_eventos: pixelData,
    // Lead form
    leads: String(leads),
    custo_por_lead: custoLead,
    // Messaging
    conversas_iniciadas: String(conversas),
    custo_por_mensagem: custoMensagem,
    // Traffic
    cliques_link: String(cliquesLink),
    cpc_link: cpcLink,
    visualizacoes_pagina: String(visualizacoesPagina),
  }

  const tpl = template?.trim() || DEFAULT_TEMPLATE

  // Remover linhas com "—" se não houver dados (limpeza automática)
  let texto = applyTemplate(tpl, vars)
  texto = texto.replace(/^.+: —\n?/gm, '') // remove linhas "Campo: —"
  texto = texto.replace(/\n{3,}/g, '\n\n').trim() // limpa espaços duplos

  if (pixelEvents.length === 0 && spend > 0) {
    texto += `\n\n⚠️ API do Meta está com instabilidade, não foi possível buscar os dados do pixel na data solicitada.`
  }

  return texto
}

// ─── Buscar dados da Meta API ──────────────────────────────────────────────────

async function fetchMetaCampaigns(accountId: string, token: string, since: string, until: string) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${accountId}/insights`)
  url.searchParams.set('fields', 'campaign_name,impressions,reach,clicks,ctr,cpm,cpc,frequency,spend,actions,action_values,cost_per_action_type')
  url.searchParams.set('time_range', JSON.stringify({ since, until }))
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('limit', '300')
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta Campaigns API error ${res.status}: ${err.substring(0, 300)}`)
  }
  const json = await res.json()
  return json.data || []
}

async function fetchMetaPixel(pixelId: string, token: string, startISO: string, endISO: string) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/stats`)
  url.searchParams.set('aggregation', 'event_total_counts')
  url.searchParams.set('start_time', startISO)
  url.searchParams.set('end_time', endISO)
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString())
  if (!res.ok) {
    console.warn(`Meta Pixel API error ${res.status} (non-critical)`)
    return []
  }
  const json = await res.json()
  return json.data?.[0]?.data || []
}

async function sendWhatsApp(recipient: string, text: string) {
  const target = recipient.includes('@') ? recipient : recipient.replace(/[^0-9]/g, '')
  const endpoint = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({ number: target, text, delay: 1200 }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution API error ${res.status}: ${err.substring(0, 200)}`)
  }
  return res.json()
}

// ─── Processar um config ───────────────────────────────────────────────────────

async function processConfig(config: any) {
  console.log(`📊 Processando relatório: ${config.client_name}`)

  const dates = calculateDateRange(config.timezone_offset ?? -3)
  console.log(`📅 Data: ${dates.formattedDate} (since=${dates.since})`)

  // Buscar campanhas e pixel em paralelo (com delay de 10s no pixel, como n8n)
  const [campaigns] = await Promise.all([
    fetchMetaCampaigns(config.meta_account_id, config.meta_access_token, dates.since, dates.until),
  ])

  // Aguardar 10s antes do pixel (replica o Wait do n8n)
  await new Promise(r => setTimeout(r, 10_000))

  const pixelEvents = config.meta_pixel_id
    ? await fetchMetaPixel(config.meta_pixel_id, config.meta_access_token, dates.startISO, dates.endISO)
    : []

  if (campaigns.length === 0) {
    // Sem campanhas - enviar mensagem de sem atividade
    const texto = buildReportText({
      campaignName: '—',
      spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, cpc: 0, frequency: 0,
      actions: [],
      actionValues: [],
      pixelEvents: [],
      formattedDate: dates.formattedDate,
      template: config.report_template,
    })
    await sendWhatsApp(config.whatsapp_recipient, texto)
    return { sent: true, campaigns: 0 }
  }

  // Enviar um relatório por campanha (ou agrupar se preferir)
  for (const campaign of campaigns) {
    const actions: any[] = []
    const actionValues: any[] = []

    // Extrair actions da array (replica Extrai Metricas da Array Actions)
    if (campaign.actions) {
      for (const a of campaign.actions) {
        actions.push(a)
      }
    }
    if (campaign.action_values) {
      for (const a of campaign.action_values) {
        actionValues.push(a)
      }
    }

    const texto = buildReportText({
      campaignName: campaign.campaign_name || '—',
      spend: Number(campaign.spend || 0),
      impressions: Number(campaign.impressions || 0),
      reach: Number(campaign.reach || 0),
      clicks: Number(campaign.clicks || 0),
      ctr: Number(campaign.ctr || 0),
      cpm: Number(campaign.cpm || 0),
      cpc: Number(campaign.cpc || 0),
      frequency: Number(campaign.frequency || 0),
      actions,
      actionValues,
      pixelEvents,
      formattedDate: dates.formattedDate,
      template: config.report_template,
    })

    await sendWhatsApp(config.whatsapp_recipient, texto)
    console.log(`✅ Relatório enviado para ${config.client_name} (${campaign.campaign_name})`)
  }

  return { sent: true, campaigns: campaigns.length }
}

// ─── Servidor ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const { config_id } = body // se vier um id, processa só aquele

    let configs: any[]

    if (config_id) {
      const { data, error } = await supabase
        .from('meta_report_configs')
        .select('*')
        .eq('id', config_id)
        .single()
      if (error) throw error
      configs = [data]
    } else {
      const { data, error } = await supabase
        .from('meta_report_configs')
        .select('*')
        .eq('enabled', true)
      if (error) throw error
      configs = data ?? []
    }

    console.log(`📋 Processando ${configs.length} configuração(ões)...`)

    const results = []
    for (const config of configs) {
      try {
        const result = await processConfig(config)
        results.push({ id: config.id, client: config.client_name, ...result })

        await supabase
          .from('meta_report_configs')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', config.id)
      } catch (err: any) {
        console.error(`❌ Erro em ${config.client_name}:`, err.message)
        results.push({ id: config.id, client: config.client_name, sent: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const err = error as Error
    console.error('Erro geral:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
