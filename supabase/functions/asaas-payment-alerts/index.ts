import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ASAAS_KEY     = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_URL     = "https://api.asaas.com/v3";
const EVO_URL       = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE  = Deno.env.get("EVOLUTION_INSTANCE") ?? "agencia02";
const EVO_KEY       = Deno.env.get("EVOLUTION_API_KEY") ?? "";

// ── Feriados nacionais brasileiros ─────────────────────────────────────────

function getEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getBrazilianHolidays(year: number): Set<string> {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const easter = getEaster(year);
  return new Set([
    `${year}-01-01`, `${year}-04-21`, `${year}-05-01`,
    `${year}-09-07`, `${year}-10-12`, `${year}-11-02`,
    `${year}-11-15`, `${year}-11-20`, `${year}-12-25`,
    iso(shift(easter, -48)), iso(shift(easter, -47)),
    iso(shift(easter, -2)),  iso(shift(easter, 60)),
  ]);
}

function isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6; }
function isHoliday(d: Date, h: Set<string>): boolean { return h.has(d.toISOString().slice(0, 10)); }
function isBusinessDay(d: Date, h: Set<string>): boolean { return !isWeekend(d) && !isHoliday(d, h); }

function prevBusinessDay(d: Date, h: Set<string>): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - 1);
  while (!isBusinessDay(r, h)) r.setDate(r.getDate() - 1);
  return r;
}

function effectiveDueDate(due: Date, h: Set<string>): Date {
  return isBusinessDay(due, h) ? due : prevBusinessDay(due, h);
}

// ── Helpers de data ────────────────────────────────────────────────────────

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const msDay = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / msDay);
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateBR(iso: string): string {
  return iso.split("-").reverse().join("/");
}

// ── Asaas helpers ──────────────────────────────────────────────────────────

async function asaasGetAll(path: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${ASAAS_URL}${path}${sep}limit=${limit}&offset=${offset}`, {
      headers: { access_token: ASAAS_KEY },
    });
    if (!r.ok) break;
    const data = await r.json();
    const items = data.data ?? [];
    all.push(...items);
    if (!data.hasMore) break;
    offset += limit;
  }
  return all;
}

// ── Evolution API ──────────────────────────────────────────────────────────

async function sendWhatsApp(number: string, text: string): Promise<void> {
  try {
    await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number, text }),
    });
  } catch (e) {
    console.error("sendWhatsApp error:", (e as Error).message);
  }
}

// ── Deduplicação ───────────────────────────────────────────────────────────

async function wasNotifiedRecently(
  supabase: ReturnType<typeof createClient>,
  paymentId: string,
  type: string,
  withinDays: number
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - withinDays);
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("asaas_payment_id", paymentId)
    .eq("type", type)
    .gte("sent_at", since.toISOString())
    .limit(1);
  return (data ?? []).length > 0;
}

async function logNotification(
  supabase: ReturnType<typeof createClient>,
  entry: {
    asaas_customer_id?: string;
    client_name?: string;
    type: string;
    channel: string;
    asaas_payment_id?: string;
    days_overdue?: number;
    status: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("notification_logs").insert(entry);
}

// ── Escalada de vencidos ───────────────────────────────────────────────────

function overdueConfig(daysOverdue: number): { type: string; withinDays: number; urgency: "mild" | "urgent" | "persistent" } {
  if (daysOverdue <= 3)  return { type: "overdue_mild",       withinDays: 1, urgency: "mild" };
  if (daysOverdue <= 10) return { type: "overdue_urgent",     withinDays: 1, urgency: "urgent" };
  return                        { type: "overdue_persistent", withinDays: 5, urgency: "persistent" };
}

// ── Mensagens ─────────────────────────────────────────────────────────────

function msgDueSoon(name: string, description: string, dueDate: string, value: string, invoiceUrl: string, daysLeft: number): string {
  const intro = daysLeft === 0
    ? `Olá! ⚠️ Sua fatura vence *hoje*. Segue o resumo:`
    : `Olá! 📅 Sua fatura vence em *${daysLeft} dias* (${fmtDateBR(dueDate)}). Segue o resumo:`;
  return (
    `${intro}\n\n` +
    `*Cliente:* ${name}\n` +
    `*Descrição:* ${description}\n` +
    `*Vencimento:* ${fmtDateBR(dueDate)}\n` +
    `*Valor:* ${value}\n\n` +
    `*Link para pagamento:* ${invoiceUrl}\n\n` +
    (daysLeft === 0
      ? `Evite bloqueios! Regularize ainda hoje para manter seu serviço ativo.\nSe já pagou, pode ignorar este aviso. 😊`
      : `Pague dentro do prazo e evite imprevistos. Se precisar de ajuda, é só chamar! 😊`)
  );
}

function msgOverdue(name: string, description: string, dueDate: string, value: string, invoiceUrl: string, urgency: "mild" | "urgent" | "persistent"): string {
  const headers = {
    mild:       "Olá! 😊 Identificamos um pagamento em aberto:",
    urgent:     "Olá! ⚠️ Seu pagamento está em atraso. Regularize o quanto antes:",
    persistent: "Olá! 🔴 Fatura em atraso. Evite bloqueio do serviço:",
  };
  return (
    `${headers[urgency]}\n\n` +
    `*Cliente:* ${name}\n` +
    `*Descrição:* ${description}\n` +
    `*Vencimento:* ${fmtDateBR(dueDate)} + juros de atraso\n` +
    `*Valor base:* ${value}\n\n` +
    `*Link para pagamento:* ${invoiceUrl}\n\n` +
    `Se já realizou o pagamento, favor desconsiderar este aviso.`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const todayISO = isoToday();
  const today    = parseLocalDate(todayISO);
  const holidays = getBrazilianHolidays(today.getFullYear());

  const results = { pending: 0, overdue: 0, skipped: 0, errors: 0 };

  try {
    // ── 1. Busca clientes do Asaas para montar mapa id → {name, phone, group_id} ──
    const asaasCustomers = await asaasGetAll("/customers") as Array<{ id: string; name: string; mobilePhone?: string }>;
    const customerMap = new Map<string, { name: string; phone: string }>();
    for (const c of asaasCustomers) {
      customerMap.set(c.id, { name: c.name, phone: c.mobilePhone ?? "" });
    }

    // Busca group_id dos clientes no Supabase (pelo nome da empresa)
    const { data: supabaseClients } = await supabase
      .from("clients")
      .select("company, group_id, phone");
    const groupMap = new Map<string, string>(); // name → group_id
    for (const c of supabaseClients ?? []) {
      if (c.group_id) groupMap.set(c.company?.toLowerCase(), c.group_id);
    }

    // ── 2. Pagamentos PENDENTES (lembretes D-5, D-2, D-0) ────────────────────
    const pending = await asaasGetAll("/payments?status=PENDING") as Array<{
      id: string; customer: string; description?: string;
      dueDate: string; value: number; invoiceUrl?: string;
    }>;

    for (const p of pending) {
      try {
        const rawDue      = parseLocalDate(p.dueDate);
        const effDue      = effectiveDueDate(rawDue, holidays);
        const effDueISO   = effDue.toISOString().slice(0, 10);
        const daysToEffDue = daysBetween(today, effDue);
        const customer    = customerMap.get(p.customer);
        if (!customer) continue;

        // Determina tipo de alerta
        let notifType: string | null = null;
        let daysLeft = 0;
        if (daysToEffDue === 0) { notifType = "due_today";    daysLeft = 0; }
        else if (daysToEffDue === 2) { notifType = "due_soon_2d"; daysLeft = 2; }
        else if (daysToEffDue === 5) { notifType = "due_soon_5d"; daysLeft = 5; }

        if (!notifType) { results.skipped++; continue; }

        // Deduplicação: só uma por tipo por pagamento por dia
        const alreadySent = await wasNotifiedRecently(supabase, p.id, notifType, 1);
        if (alreadySent) { results.skipped++; continue; }

        const value   = fmtBRL(p.value);
        const message = msgDueSoon(customer.name, p.description ?? "", effDueISO, value, p.invoiceUrl ?? "", daysLeft);
        const phone   = customer.phone;
        const groupId = groupMap.get(customer.name.toLowerCase());

        // WhatsApp pessoal
        if (phone) await sendWhatsApp(phone, message);
        // WhatsApp grupo do cliente
        if (groupId) await sendWhatsApp(groupId, message);

        await logNotification(supabase, {
          asaas_customer_id: p.customer,
          client_name: customer.name,
          type: notifType,
          channel: "whatsapp",
          asaas_payment_id: p.id,
          status: "sent",
          metadata: { daysToEffDue, effDueISO },
        });

        results.pending++;
      } catch (e) {
        console.error("pending payment error:", (e as Error).message);
        results.errors++;
      }
    }

    // ── 3. Pagamentos VENCIDOS (escalada por tempo) ───────────────────────────
    const overdue = (await asaasGetAll("/payments?status=OVERDUE")) as Array<{
      id: string; customer: string; description?: string;
      dueDate: string; value: number; invoiceUrl?: string;
    }>;

    for (const p of overdue) {
      try {
        const rawDue     = parseLocalDate(p.dueDate);
        const daysLate   = daysBetween(rawDue, today);
        const customer   = customerMap.get(p.customer);
        if (!customer) continue;

        const { type: notifType, withinDays, urgency } = overdueConfig(daysLate);
        const alreadySent = await wasNotifiedRecently(supabase, p.id, notifType, withinDays);
        if (alreadySent) { results.skipped++; continue; }

        const value   = fmtBRL(p.value);
        const message = msgOverdue(customer.name, p.description ?? "", p.dueDate, value, p.invoiceUrl ?? "", urgency);
        const phone   = customer.phone;
        const groupId = groupMap.get(customer.name.toLowerCase());

        if (phone) await sendWhatsApp(phone, message);
        if (groupId) await sendWhatsApp(groupId, message);

        await logNotification(supabase, {
          asaas_customer_id: p.customer,
          client_name: customer.name,
          type: notifType,
          channel: "whatsapp",
          asaas_payment_id: p.id,
          days_overdue: daysLate,
          status: "sent",
          metadata: { urgency },
        });

        results.overdue++;
      } catch (e) {
        console.error("overdue payment error:", (e as Error).message);
        results.errors++;
      }
    }

    // ── 4. Atualiza last_triggered_at ─────────────────────────────────────────
    await supabase
      .from("automations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("jobname", "asaas-alertas-pagamento");

    console.log("asaas-payment-alerts result:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-payment-alerts fatal:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
