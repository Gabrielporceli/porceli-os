import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const EVOLUTION_URL             = Deno.env.get('EVOLUTION_API_URL') || "https://api.gabrielporceli.com.br"
const EVOLUTION_API_KEY         = Deno.env.get('EVOLUTION_API_KEY') || "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
const EVOLUTION_INSTANCE        = Deno.env.get('EVOLUTION_INSTANCE') || "agencia03"
const GROUP_JID                 = Deno.env.get('ASAAS_ADMIN_GROUP_JID') || "120363162167738258@g.us"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const FONTE = "financial-alert"

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

serve(async (req) => {
  try {
    // dry_run: monta o relatório e devolve o texto, sem enviar (para conferência)
    const { dry_run } = await req.json().catch(() => ({}))
    const today    = new Date().toISOString().split('T')[0]
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: overdueFinances } = await supabase
      .from('financial_entries')
      .select('name, amount, due_date, status, reference, client_id, clients(company, responsible, phone)')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    // Contratos a vencer: SÓ RECORRENTES. Pagamento único, pontual e rescisão
    // têm fim por natureza — não são "contrato vencendo" que precise renovar.
    const { data: vencendoBruto } = await supabase
      .from('contracts')
      .select('id, type, category, single_payment, monthly_value, start_date, end_date, client_id, clients(company, responsible, phone)')
      .not('status', 'in', '(inactive,cancelled)')
      .gte('end_date', today)
      .lte('end_date', in30Days)
      .order('end_date', { ascending: true })
    const vencendo = (vencendoBruto ?? []).filter(
      (c: any) => (c.category ?? 'recorrente') === 'recorrente' && !c.single_payment
    )

    // Renovação = outro contrato recorrente do MESMO cliente, ainda valendo,
    // começando até 30 dias antes ou depois do fim deste (mesma regra do
    // Dashboard). Contrato cancelado não conta como renovação.
    const clientIds = [...new Set(vencendo.map((c: any) => c.client_id).filter(Boolean))]
    const { data: candidatos } = clientIds.length
      ? await supabase
          .from('contracts')
          .select('id, client_id, category, single_payment, start_date')
          .in('client_id', clientIds)
          .not('status', 'in', '(inactive,cancelled)')
      : { data: [] as any[] }
    const DIA = 86400000
    const sucessor = (c: any) => (candidatos ?? [])
      .filter((o: any) =>
        o.id !== c.id && o.client_id === c.client_id &&
        (o.category ?? 'recorrente') === 'recorrente' && !o.single_payment &&
        Math.abs(new Date(o.start_date + 'T12:00:00').getTime() - new Date(c.end_date + 'T12:00:00').getTime()) <= 30 * DIA)
      .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))[0]

    const semRenovacao = vencendo.filter((c: any) => !sucessor(c))
    const renovados    = vencendo.filter((c: any) => !!sucessor(c))

    const hasOverdue  = overdueFinances && overdueFinances.length > 0
    const hasExpiring = vencendo.length > 0

    if (!hasOverdue && !hasExpiring) {
      await supabase
        .from('automations')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('jobname', 'alerta-financeiro-diario')
      return new Response(JSON.stringify({ success: true, message: "Nada a reportar hoje." }), { status: 200 })
    }

    const dateLabel = new Date().toLocaleDateString('pt-BR')
    let message = `*Relatorio Financeiro - ${dateLabel}*\n\n`

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

      message += `*Clientes Inadimplentes: ${Object.keys(byClient).length}*\n\n`
      message += `*Caixa total de inadimplentes: ${formatMoney(totalInadimplentes)}*\n`

      for (const { company, responsible, entries } of Object.values(byClient)) {
        const total = entries.reduce((s, e) => s + e.amount, 0)
        message += `\n*${company}*`
        if (responsible) message += ` (${responsible})`
        message += `\n`
        for (const e of entries) {
          message += `  - ${referenceMonth(e.date)}: *${formatMoney(e.amount)}*\n`
        }
        if (entries.length > 1) {
          message += `  Total: *${formatMoney(total)}*\n`
        }
      }
      message += `\n`
    } else {
      message += `*Sem inadimplentes no momento.*\n\n`
    }

    const dataBR = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
    if (semRenovacao.length > 0) {
      message += `*CONTRATOS VENCENDO EM 30 DIAS — SEM RENOVACAO (${semRenovacao.length}):*\n`
      for (const c of semRenovacao as any[]) {
        const client   = c.clients
        const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
        message += `\n*${client?.company || 'Cliente desconhecido'}*\n`
        message += `  - Plano: ${c.type} - ${formatMoney(Number(c.monthly_value))}/mes\n`
        message += `  - Vence em: *${dataBR(c.end_date)}* (${daysLeft} dias)\n`
      }
    } else {
      message += `*Sem contratos recorrentes vencendo sem renovacao nos proximos 30 dias.*\n`
    }

    // Já renovados: só uma linha de registro, sem alarme.
    if (renovados.length > 0) {
      message += `\n*Ja renovados (${renovados.length}):*\n`
      for (const c of renovados as any[]) {
        const s = sucessor(c)
        message += `  - ${c.clients?.company || 'Cliente desconhecido'}: vence ${dataBR(c.end_date)}, novo contrato a partir de ${dataBR(s.start_date)}\n`
      }
    }

    if (dry_run) return new Response(JSON.stringify({ success: true, dry_run: true, message }), { status: 200 })

    const fila = await enfileirarWhatsApp(GROUP_JID, message)
    if (!fila.ok) throw new Error(fila.error)

    await supabase
      .from('automations')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('jobname', 'alerta-financeiro-diario')

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
})
