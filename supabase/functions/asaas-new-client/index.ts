import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ASAAS_KEY        = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_URL        = "https://api.asaas.com/v3";
const EVO_URL          = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE     = "agencia03";
const EVO_KEY          = "E42F543C93BB-4A59-B3A1-8AA2E506DC00";
const ADMIN_GROUP      = Deno.env.get("ASAAS_ADMIN_GROUP_JID") ?? "120363162167738258@g.us";

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
    iso(shift(easter, -48)), // Segunda de Carnaval
    iso(shift(easter, -47)), // Terça de Carnaval
    iso(shift(easter, -2)),  // Sexta-feira Santa
    iso(shift(easter, 60)),  // Corpus Christi
  ]);
}

function holidaysForRange(startYear: number, endYear: number): Set<string> {
  const all = new Set<string>();
  for (let y = startYear; y <= endYear; y++) {
    for (const h of getBrazilianHolidays(y)) all.add(h);
  }
  return all;
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

// ── Cálculo de parcelas ────────────────────────────────────────────────────

function clampDay(y: number, m: number, d: number): number {
  return Math.min(d, new Date(y, m + 1, 0).getDate());
}

function calcFirstDueDate(base: Date, payDay: number): Date {
  let y = base.getFullYear(), m = base.getMonth();
  let due = new Date(y, m, clampDay(y, m, payDay));
  if (base > due) {
    m++; if (m > 11) { m = 0; y++; }
    due = new Date(y, m, clampDay(y, m, payDay));
  }
  return due;
}

// ── Asaas helpers ──────────────────────────────────────────────────────────

async function asaasGet(path: string) {
  const r = await fetch(`${ASAAS_URL}${path}`, {
    headers: { access_token: ASAAS_KEY },
  });
  if (!r.ok) throw new Error(`Asaas GET ${path}: ${r.status}`);
  return r.json();
}

async function asaasPost(path: string, body: unknown) {
  const r = await fetch(`${ASAAS_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Asaas POST ${path}: ${r.status} — ${txt}`);
  }
  return r.json();
}

// ── Formatação de telefone ─────────────────────────────────────────────────

function formatPhoneBR(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length === 13) return `+${clean}`;
  if (clean.length === 11) return `+55${clean}`;
  if (clean.length === 10) return `+55${clean}`;
  return phone;
}

// ── Evolution API helper ───────────────────────────────────────────────────

async function sendWhatsApp(number: string, text: string): Promise<void> {
  await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({ number, text }),
  });
}

// ── Supabase log ───────────────────────────────────────────────────────────

async function logNotification(
  supabase: ReturnType<typeof createClient>,
  entry: {
    asaas_customer_id?: string;
    client_name?: string;
    type: string;
    channel: string;
    asaas_payment_id?: string;
    status: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("notification_logs").insert(entry);
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const client = body as {
      id?: string;
      company?: string;
      cnpj?: string;
      responsible?: string;
      phone?: string;
      email?: string;
      start_date?: string;
      contract_end?: string;
      payment_day?: number;
      monthly_value?: number;
    };

    // Disparo manual do painel (sem dados reais)
    if (!client.cnpj || !client.company) {
      return new Response(
        JSON.stringify({ success: false, message: "Esta automação é disparada automaticamente ao cadastrar um novo cliente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company, cnpj, responsible, phone, email, start_date, contract_end, payment_day, monthly_value } = client;
    const billingType = (body as any).billing_type ?? "BOLETO";

    // 1. Verifica se cliente já existe no Asaas
    const existing = await asaasGet(`/customers?cpfCnpj=${cnpj}`);
    let asaasCustomerId: string;

    if (existing.totalCount > 0) {
      asaasCustomerId = existing.data[0].id;
    } else {
      // 2. Cria cliente no Asaas
      const created = await asaasPost("/customers", {
        name: company,
        cpfCnpj: cnpj,
        email,
        mobilePhone: phone,
        notificationDisabled: true,
      });
      asaasCustomerId = created.id;
    }

    // 3. Calcula parcelas com ajuste de dia útil
    const startDate   = new Date(`${start_date}T00:00:00`);
    const endDate     = new Date(`${contract_end}T00:00:00`);
    const payDay      = Number(payment_day);
    const monthly     = Number(monthly_value);
    const today       = new Date(); today.setHours(0, 0, 0, 0);
    const base        = startDate > today ? startDate : today;
    const holidays    = holidaysForRange(startDate.getFullYear(), endDate.getFullYear());
    const firstDue    = calcFirstDueDate(base, payDay);
    const effDue      = effectiveDueDate(firstDue, holidays);

    // Diferença em meses entre firstDue e (endDate - 1 dia)
    const dayBefore   = new Date(endDate); dayBefore.setDate(dayBefore.getDate() - 1);
    let months = (dayBefore.getFullYear() - firstDue.getFullYear()) * 12
               + (dayBefore.getMonth() - firstDue.getMonth());
    if (dayBefore.getDate() < firstDue.getDate()) months--;
    const installments = Math.max(1, months + 1);
    const totalValue   = monthly * installments;
    const firstDueDateISO = effDue.toISOString().slice(0, 10);

    // 4. Cria cobrança parcelada no Asaas
    await asaasPost("/payments", {
      customer: asaasCustomerId,
      billingType,
      installmentCount: installments,
      totalValue,
      dueDate: firstDueDateISO,
      description: "Parcelamento de contrato",
      notificationDisabled: true,
      interest: { value: 1 },
      fine: { value: 2 },
    });

    // 5. Busca group_id do cliente no Supabase
    let groupId = ADMIN_GROUP;
    if (client.id) {
      const { data: row } = await supabase
        .from("clients")
        .select("group_id")
        .eq("id", client.id)
        .single();
      if (row?.group_id) groupId = row.group_id;
    }

    // 6. Formata datas BR
    const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
    const startBR   = fmtDate(start_date!);
    const endBR     = fmtDate(contract_end!);
    const firstBR   = fmtDate(firstDueDateISO);

    // 7. Notifica grupo interno
    const groupMsg =
      `Cliente cadastrado ✅\n` +
      `Empresa: ${company}\n` +
      `Responsável: ${responsible}\n` +
      `Telefone: ${phone}\n` +
      `Início do contrato: ${startBR}\n` +
      `Fim do contrato: ${endBR}\n` +
      `Nº de parcelas: ${installments}\n` +
      `Dia do pagamento: ${payDay}\n` +
      `Valor mensal: R$${monthly.toFixed(2)}\n` +
      `Valor total: R$${totalValue.toFixed(2)}\n` +
      `Primeiro vencimento: ${firstBR}${effDue.getTime() !== firstDue.getTime() ? " (antecipado — dia útil)" : ""}`;

    await sendWhatsApp(groupId, groupMsg);

    // 8. Mensagem de boas-vindas para o cliente
    if (phone) {
      const clientMsg =
        `Olá, ${responsible}! 👋\n\n` +
        `Seu cadastro na *${company}* foi realizado com sucesso.\n\n` +
        `*Detalhes do contrato:*\n` +
        `• Vigência: ${startBR} até ${endBR}\n` +
        `• Parcelas: ${installments}x de R$${monthly.toFixed(2)}\n` +
        `• Vencimento todo dia ${payDay}\n` +
        `• Primeiro boleto: ${firstBR}\n\n` +
        `Em breve você receberá o link do boleto. Qualquer dúvida, estamos à disposição!`;
      await sendWhatsApp(formatPhoneBR(phone), clientMsg);
    }

    // 9. Log de notificações
    await logNotification(supabase, {
      asaas_customer_id: asaasCustomerId,
      client_name: company,
      type: "new_client",
      channel: "group",
      status: "sent",
      metadata: { installments, totalValue, firstDueDateISO },
    });

    // 10. Atualiza last_triggered_at da automação
    await supabase
      .from("automations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("jobname", "asaas-novo-cliente");

    return new Response(
      JSON.stringify({ success: true, asaasCustomerId, installments, totalValue, firstDueDateISO }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-new-client error:", e.message);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
