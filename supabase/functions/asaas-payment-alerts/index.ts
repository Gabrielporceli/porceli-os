import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ASAAS_KEY    = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_BASE   = "https://api.asaas.com/v3";
const EVO_URL      = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "agencia02";
const EVO_KEY      = Deno.env.get("EVOLUTION_API_KEY") ?? "";

// ── Feriados ───────────────────────────────────────────────────────────────────

function getEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

function getBrazilianHolidays(year: number): Set<string> {
  const iso   = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const e = getEaster(year);
  return new Set([
    `${year}-01-01`,`${year}-04-21`,`${year}-05-01`,
    `${year}-09-07`,`${year}-10-12`,`${year}-11-02`,
    `${year}-11-15`,`${year}-11-20`,`${year}-12-25`,
    iso(shift(e,-48)),iso(shift(e,-47)),iso(shift(e,-2)),iso(shift(e,60)),
  ]);
}

function isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6; }
function isHoliday(d: Date, h: Set<string>): boolean { return h.has(d.toISOString().slice(0,10)); }
function isBusinessDay(d: Date, h: Set<string>): boolean { return !isWeekend(d) && !isHoliday(d,h); }
function prevBD(d: Date, h: Set<string>): Date { const r = new Date(d); r.setDate(r.getDate()-1); while(!isBusinessDay(r,h)) r.setDate(r.getDate()-1); return r; }
function effectiveDue(due: Date, h: Set<string>): Date { return isBusinessDay(due,h) ? due : prevBD(due,h); }

// Retorna o dia útil em que a notificação deve ser enviada (antecipa se cair em fim de semana/feriado)
function notifDay(due: Date, daysAhead: number, h: Set<string>): string {
  const raw = new Date(due); raw.setDate(raw.getDate() - daysAhead);
  const bd  = isBusinessDay(raw, h) ? raw : prevBD(raw, h);
  return bd.toISOString().slice(0, 10);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function todayBRT(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

function formatPhoneBR(phone: string): string {
  const c = phone.replace(/\D/g, "");
  if (c.startsWith("55") && c.length === 13) return `+${c}`;
  if (c.length === 11) return `+55${c}`;
  if (c.length === 10) return `+55${c}`;
  return phone;
}

// ── Asaas ──────────────────────────────────────────────────────────────────────

async function asaasGetAll(path: string): Promise<unknown[]> {
  const all: unknown[] = []; let offset = 0;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${ASAAS_BASE}${path}${sep}limit=100&offset=${offset}`, { headers: { access_token: ASAAS_KEY } });
    if (!r.ok) break;
    const data = await r.json(); all.push(...(data.data ?? [])); if (!data.hasMore) break; offset += 100;
  }
  return all;
}

// ── Evolution API ──────────────────────────────────────────────────────────────

async function sendWhatsApp(number: string, text: string): Promise<void> {
  try {
    await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number, text }),
    });
  } catch (e) { console.error("sendWhatsApp:", (e as Error).message); }
}

// ── Deduplicação ───────────────────────────────────────────────────────────────

async function wasNotified(
  supabase: ReturnType<typeof createClient>,
  paymentId: string, type: string, withinDays: number
): Promise<boolean> {
  const since = new Date(); since.setDate(since.getDate() - withinDays);
  const { data } = await supabase
    .from("notification_logs").select("id")
    .eq("asaas_payment_id", paymentId).eq("type", type)
    .gte("sent_at", since.toISOString()).limit(1);
  return (data ?? []).length > 0;
}

async function logNotif(supabase: ReturnType<typeof createClient>, entry: Record<string, unknown>): Promise<void> {
  await supabase.from("notification_logs").insert(entry);
}

// ── Escalada ───────────────────────────────────────────────────────────────────

function overdueConfig(d: number): { type: string; withinDays: number; urgency: "mild" | "urgent" | "persistent" } {
  if (d <= 3)  return { type: "overdue_mild",       withinDays: 1, urgency: "mild" };
  if (d <= 10) return { type: "overdue_urgent",     withinDays: 1, urgency: "urgent" };
  return              { type: "overdue_persistent", withinDays: 5, urgency: "persistent" };
}

// ── Mensagens ──────────────────────────────────────────────────────────────────

function msgPending(name: string, desc: string, due: string, val: string, url: string, days: number): string {
  const intro = days === 0
    ? `Olá! ⚠️ Sua fatura vence *hoje*. Segue o resumo:`
    : `Olá! Sua fatura vence em *${days} dias* (${fmtDate(due)}). Segue o resumo:`;
  const footer = days === 0
    ? `Regularize ainda hoje para manter o serviço ativo. Se já pagou, pode ignorar. 😊`
    : `Pague dentro do prazo e evite imprevistos. 😊`;
  return `${intro}\n\n*Cliente:* ${name}\n*Descrição:* ${desc}\n*Vencimento:* ${fmtDate(due)}\n*Valor:* ${val}\n\n*Link para pagamento:* ${url}\n\n${footer}`;
}

function msgOverdue(name: string, desc: string, due: string, val: string, url: string, urgency: "mild" | "urgent" | "persistent"): string {
  const headers = {
    mild:       `Olá! 😊 Identificamos um pagamento em aberto:`,
    urgent:     `Olá! ⚠️ Seu pagamento está em atraso. Regularize o quanto antes:`,
    persistent: `Olá! 🔴 Fatura em atraso. Evite bloqueio do serviço:`,
  };
  return `${headers[urgency]}\n\n*Cliente:* ${name}\n*Descrição:* ${desc}\n*Vencimento:* ${fmtDate(due)} + juros de atraso\n*Valor base:* ${val}\n\n*Link para pagamento:* ${url}\n\nSe já realizou o pagamento, favor desconsiderar este aviso.`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const todayISO = todayBRT();
  const today    = parseLocalDate(todayISO);
  const holidays = getBrazilianHolidays(today.getFullYear());
  const results  = { pending: 0, overdue: 0, skipped: 0, errors: 0 };

  // Nunca envia notificações em finais de semana ou feriados nacionais
  if (!isBusinessDay(today, holidays)) {
    console.log(`asaas-payment-alerts: ${todayISO} não é dia útil — notificações suspensas.`);
    await supabase.from("automations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("jobname", "asaas-alertas-pagamento");
    return new Response(
      JSON.stringify({ success: true, message: "Dia não útil — notificações não enviadas.", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Mapa clientes Asaas: id → { name, phone }
    const asaasCustomers = (await asaasGetAll("/customers")) as Array<{ id: string; name: string; mobilePhone?: string }>;
    const customerMap = new Map<string, { name: string; phone: string }>();
    for (const c of asaasCustomers) customerMap.set(c.id, { name: c.name, phone: c.mobilePhone ?? "" });

    // Mapa group_id Supabase: company_lower → group_id
    const { data: sbClients } = await supabase.from("clients").select("company, group_id");
    const groupMap = new Map<string, string>();
    for (const c of sbClients ?? []) {
      if (c.group_id) groupMap.set((c.company ?? "").toLowerCase(), c.group_id);
    }

    // ── PENDENTES: D-5, D-2, D-0 ──────────────────────────────────────────────
    const pending = (await asaasGetAll("/payments?status=PENDING")) as Array<{
      id: string; customer: string; description?: string;
      dueDate: string; value: number; invoiceUrl?: string;
    }>;

    for (const p of pending) {
      try {
        const rawDue  = parseLocalDate(p.dueDate);
        const effDue  = effectiveDue(rawDue, holidays);
        const cust    = customerMap.get(p.customer);
        if (!cust) continue;

        // Calcula o dia útil correspondente a cada janela de notificação (antecipa se cair em fds/feriado)
        const nd5 = notifDay(effDue, 5, holidays);
        const nd2 = notifDay(effDue, 2, holidays);
        const nd0 = notifDay(effDue, 0, holidays);

        let type: string | null = null;
        if (todayISO === nd0)      type = "due_today";
        else if (todayISO === nd2) type = "due_soon_2d";
        else if (todayISO === nd5) type = "due_soon_5d";
        if (!type) { results.skipped++; continue; }

        if (await wasNotified(supabase, p.id, type, 1)) { results.skipped++; continue; }

        const daysLeft = daysBetween(today, effDue);
        const effISO   = effDue.toISOString().slice(0, 10);
        const msg      = msgPending(cust.name, p.description ?? "", effISO, fmtBRL(p.value), p.invoiceUrl ?? "", daysLeft);

        if (cust.phone) await sendWhatsApp(formatPhoneBR(cust.phone), msg);
        const gid = groupMap.get(cust.name.toLowerCase());
        if (gid) await sendWhatsApp(gid, msg);

        await logNotif(supabase, { asaas_customer_id: p.customer, client_name: cust.name, type, channel: "whatsapp", asaas_payment_id: p.id, status: "sent", metadata: { daysLeft, effISO } });
        results.pending++;
      } catch (e) { console.error("pending:", (e as Error).message); results.errors++; }
    }

    // ── VENCIDOS: escalada ─────────────────────────────────────────────────────
    const overdue = (await asaasGetAll("/payments?status=OVERDUE")) as Array<{
      id: string; customer: string; description?: string;
      dueDate: string; value: number; invoiceUrl?: string;
    }>;

    for (const p of overdue) {
      try {
        const daysLate = daysBetween(parseLocalDate(p.dueDate), today);
        const cust     = customerMap.get(p.customer);
        if (!cust) continue;

        const { type, withinDays, urgency } = overdueConfig(daysLate);
        if (await wasNotified(supabase, p.id, type, withinDays)) { results.skipped++; continue; }

        const msg = msgOverdue(cust.name, p.description ?? "", p.dueDate, fmtBRL(p.value), p.invoiceUrl ?? "", urgency);

        if (cust.phone) await sendWhatsApp(formatPhoneBR(cust.phone), msg);
        const gid = groupMap.get(cust.name.toLowerCase());
        if (gid) await sendWhatsApp(gid, msg);

        await logNotif(supabase, { asaas_customer_id: p.customer, client_name: cust.name, type, channel: "whatsapp", asaas_payment_id: p.id, days_overdue: daysLate, status: "sent", metadata: { urgency } });
        results.overdue++;
      } catch (e) { console.error("overdue:", (e as Error).message); results.errors++; }
    }

    await supabase.from("automations").update({ last_triggered_at: new Date().toISOString() }).eq("jobname", "asaas-alertas-pagamento");
    console.log("asaas-payment-alerts:", results);
    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-payment-alerts fatal:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
