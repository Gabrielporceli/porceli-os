import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const EVOLUTION_URL             = Deno.env.get('EVOLUTION_API_URL') || "https://api.gabrielporceli.com.br"
const EVOLUTION_API_KEY         = Deno.env.get('EVOLUTION_API_KEY') || ""
const EVOLUTION_INSTANCE        = Deno.env.get('EVOLUTION_INSTANCE') || "agencia02"
const GROUP_JID                 = Deno.env.get('ASAAS_ADMIN_GROUP_JID') || "120363162167738258@g.us"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function referenceMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${MESES[d.getMonth()]}/${d.getFullYear()}`
}

serve(async () => {
  try {
    const today    = new Date().toISOString().split('T')[0]
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: overdueFinances } = await supabase
      .from('financial_entries')
      .select('name, amount, due_date, status, reference, client_id, clients(company, responsible, phone)')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('type, monthly_value, end_date, client_id, clients(company, responsible, phone)')
      .neq('status', 'inactive')
      .gte('end_date', today)
      .lte('end_date', in30Days)
      .order('end_date', { ascending: true })

    const hasOverdue  = overdueFinances && overdueFinances.length > 0
    const hasExpiring = expiringContracts && expiringContracts.length > 0

    if (!hasOverdue && !hasExpiring) {
      return new Response(JSON.stringify({ success: true, message: "Nada a reportar hoje." }), { status: 200 })
    }

    const dateLabel = new Date().toLocaleDateString('pt-BR')
    let message = `💰 *Relatório Financeiro - ${dateLabel}*\n\n`

    if (hasOverdue) {
      const byClient: Record<string, { company: string; responsible: string; entries: { amount: number; date: string }[] }> = {}

      for (const f of overdueFinances!) {
        const client = (f as any).clients
        const key = f.client_id || 'sem-cliente'
        if (!byClient[key]) {
          byClient[key] = {
            company:     client?.company || 'Cliente desconhecido',
            responsible: client?.responsible || '',
            entries: []
          }
        }
        byClient[key].entries.push({ amount: Number(f.amount), date: f.due_date })
      }

      const totalInadimplentes = Object.values(byClient)
        .flatMap(c => c.entries)
        .reduce((s, e) => s + e.amount, 0)

      message += `🔴 *Clientes Inadimplentes: ${Object.keys(byClient).length}*\n`
      message += `💸 *Caixa total de inadimplentes: ${formatMoney(totalInadimplentes)}*\n`

      for (const { company, responsible, entries } of Object.values(byClient)) {
        const total = entries.reduce((s, e) => s + e.amount, 0)
        message += `\n*${company}*`
        if (responsible) message += ` (${responsible})`
        message += `\n`
        for (const e of entries) {
          message += `  • ${referenceMonth(e.date)}: *${formatMoney(e.amount)}*\n`
        }
        if (entries.length > 1) {
          message += `  📌 Total: *${formatMoney(total)}*\n`
        }
      }
      message += `\n`
    } else {
      message += `✅ *Sem inadimplentes no momento.*\n\n`
    }

    if (hasExpiring) {
      message += `⚠️ *CONTRATOS VENCENDO EM 30 DIAS (${expiringContracts!.length}):*\n`
      for (const c of expiringContracts!) {
        const client   = (c as any).clients
        const endDate  = new Date(c.end_date + 'T12:00:00').toLocaleDateString('pt-BR')
        const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
        message += `\n*${client?.company || 'Cliente desconhecido'}*\n`
        message += `  • Plano: ${c.type} — ${formatMoney(Number(c.monthly_value))}/mês\n`
        message += `  • Vence em: *${endDate}* (${daysLeft} dias)\n`
      }
    } else {
      message += `✅ *Sem contratos vencendo nos próximos 30 dias.*`
    }

    await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: GROUP_JID, text: message })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
})
