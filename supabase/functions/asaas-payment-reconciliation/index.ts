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
const ADMIN_GROUP   = Deno.env.get("ASAAS_ADMIN_GROUP_JID") ?? "120363162167738258@g.us";

// ── Asaas helpers ──────────────────────────────────────────────────────────

async function asaasGetAll(path: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let offset = 0;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${ASAAS_URL}${path}${sep}limit=100&offset=${offset}`, {
      headers: { access_token: ASAAS_KEY },
    });
    if (!r.ok) break;
    const data = await r.json();
    all.push(...(data.data ?? []));
    if (!data.hasMore) break;
    offset += 100;
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

// ── Match helpers (portado do n8n) ─────────────────────────────────────────

function normalizeName(name: string): string {
  return (name ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

function parseBRL(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).replace(/[^\d.,-]/g, "");
  if (s.includes(",")) { s = s.replace(/\./g, ""); s = s.replace(",", "."); }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeIsoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  return String(s).includes("T") ? String(s).split("T")[0] : String(s);
}

function buildKey(name: string, isoDue: string | null): string | null {
  const nk = normalizeName(name);
  const dk = normalizeIsoDate(isoDue);
  if (!nk || !dk) return null;
  return `${nk}|${dk}`;
}

const EPS         = 0.50;
const EPS_PENALTY = 1.00;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function expectedWithPenalty(amount: number, dueIso: string, payIso: string | null): number | null {
  if (!payIso) return round2(amount);
  const due = new Date(dueIso + "T00:00:00");
  const pay = new Date(payIso + "T00:00:00");
  const lateDays = Math.max(0, Math.round((pay.getTime() - due.getTime()) / 86_400_000));
  if (lateDays <= 0) return round2(amount);
  return round2(amount + amount * 0.02 + amount * 0.01 * (lateDays / 30));
}

// ── Main ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // ── 1. Busca clientes do Asaas ───────────────────────────────────────────
    const asaasCustomers = await asaasGetAll("/customers") as Array<{ id: string; name: string }>;
    const customerNameMap = new Map<string, string>(); // asaas_id → name
    for (const c of asaasCustomers) customerNameMap.set(c.id, c.name);

    // ── 2. Busca pagamentos RECEIVED no Asaas (últimos 6 meses) ──────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const since = sixMonthsAgo.toISOString().slice(0, 10);

    const received = (await asaasGetAll(`/payments?status=RECEIVED&dueDateGe=${since}`)) as Array<{
      id: string; customer: string; dueDate: string; value: number; netValue: number;
      originalValue?: number; paymentDate?: string; confirmedDate?: string;
      billingType?: string; invoiceUrl?: string; transactionReceiptUrl?: string;
      installmentNumber?: number;
    }>;

    // ── 3. Busca entradas pendentes no Supabase (financial_entries) ───────────
    const { data: pendingEntries } = await supabase
      .from("financial_entries")
      .select("*")
      .eq("status", "pending");

    if (!pendingEntries?.length || !received.length) {
      await supabase.from("automations").update({ last_triggered_at: new Date().toISOString() }).eq("jobname", "asaas-reconciliacao");
      return new Response(JSON.stringify({ success: true, matched: 0, unmatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Indexa pagamentos por (nome + dueDate) ─────────────────────────────
    type ReceivedItem = {
      raw: (typeof received)[0];
      dueIso: string; payDateIso: string | null;
      payValue: number | null; payNet: number | null; payOriginal: number | null;
    };
    const payIndex = new Map<string, ReceivedItem[]>();

    for (const p of received) {
      const name   = customerNameMap.get(p.customer) ?? "";
      const dueIso = normalizeIsoDate(p.dueDate);
      const key    = buildKey(name, dueIso);
      if (!key || !dueIso) continue;

      const payDateIso = p.paymentDate
        ? normalizeIsoDate(p.paymentDate)
        : p.confirmedDate ? normalizeIsoDate(p.confirmedDate) : null;

      if (!payIndex.has(key)) payIndex.set(key, []);
      payIndex.get(key)!.push({
        raw: p, dueIso, payDateIso,
        payValue:    parseBRL(p.value),
        payNet:      parseBRL(p.netValue),
        payOriginal: parseBRL(p.originalValue),
      });
    }

    // ── 5. Match: pending (Supabase) × RECEIVED (Asaas) ──────────────────────
    const matched: Array<{ entryId: string; paymentId: string; clientName: string; amount: number }> = [];
    const unmatched: Array<{ name: string; due_date: string; amount: number }> = [];

    for (const entry of pendingEntries) {
      const dueIso  = normalizeIsoDate(entry.due_date);
      const key     = buildKey(entry.name ?? "", dueIso);
      if (!key) continue;

      const list = payIndex.get(key);
      if (!list?.length) { unmatched.push(entry); continue; }

      const amount = Number(entry.amount);
      if (!Number.isFinite(amount)) continue;

      let bestIdx = -1, bestScore = 99, bestDiff = Infinity;

      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const asaasVals = [c.payValue, c.payNet, c.payOriginal].filter((v): v is number => v !== null);

        // Estratégia 1: match direto
        for (const v of asaasVals) {
          const diff = Math.abs(v - amount);
          if (diff <= EPS && (1 < bestScore || diff < bestDiff)) {
            bestScore = 1; bestDiff = diff; bestIdx = i;
          }
        }
        // Estratégia 2: originalValue ≈ amount
        if (c.payOriginal !== null) {
          const diff = Math.abs(c.payOriginal - amount);
          if (diff <= EPS && (2 < bestScore || diff < bestDiff)) {
            bestScore = 2; bestDiff = diff; bestIdx = i;
          }
        }
        // Estratégia 3: com penalidade
        if (dueIso) {
          const exp = expectedWithPenalty(amount, dueIso, c.payDateIso);
          if (exp !== null) {
            for (const v of asaasVals) {
              const diff = Math.abs(v - exp);
              if (diff <= EPS_PENALTY && (3 < bestScore || diff < bestDiff)) {
                bestScore = 3; bestDiff = diff; bestIdx = i;
              }
            }
          }
        }
      }

      // Estratégia 4 (fallback): único candidato
      if (bestIdx === -1 && list.length === 1) { bestIdx = 0; bestScore = 4; }

      if (bestIdx === -1) { unmatched.push(entry); continue; }

      const chosen = list.splice(bestIdx, 1)[0];
      matched.push({ entryId: entry.id, paymentId: chosen.raw.id, clientName: entry.name ?? "", amount });
    }

    // ── 6. Atualiza entradas matched → paid ───────────────────────────────────
    for (const m of matched) {
      await supabase
        .from("financial_entries")
        .update({ status: "paid" })
        .eq("id", m.entryId);
    }

    // ── 7. Log de reconciliação ───────────────────────────────────────────────
    if (matched.length > 0) {
      await supabase.from("notification_logs").insert({
        type: "reconciliation",
        channel: "system",
        status: "sent",
        metadata: { matched: matched.length, unmatched: unmatched.length },
      });
    }

    // ── 8. Notifica equipe via WhatsApp ───────────────────────────────────────
    const nowBR = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    let report = `*Reconciliação Asaas* — ${nowBR}\n\n`;
    report += `✅ *Pagamentos confirmados:* ${matched.length}\n`;
    if (matched.length > 0) {
      report += matched.map(m => `  • ${m.clientName} — R$${m.amount.toFixed(2)}`).join("\n") + "\n";
    }
    report += `\n⚠️ *Sem match (revisar):* ${unmatched.length}`;
    if (unmatched.length > 0) {
      report += "\n" + unmatched.map(u => `  • ${u.name} — R$${u.amount ?? "?"} (${u.due_date})`).join("\n");
    }

    if (matched.length > 0 || unmatched.length > 0) {
      await sendWhatsApp(ADMIN_GROUP, report);
    }

    // ── 9. Atualiza last_triggered_at ─────────────────────────────────────────
    await supabase
      .from("automations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("jobname", "asaas-reconciliacao");

    return new Response(
      JSON.stringify({ success: true, matched: matched.length, unmatched: unmatched.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-payment-reconciliation fatal:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
