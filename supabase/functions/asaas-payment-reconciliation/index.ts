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
const ADMIN_GROUP  = Deno.env.get("ASAAS_ADMIN_GROUP_JID") ?? "120363162167738258@g.us";

const EPS         = 0.50;
const EPS_PENALTY = 1.00;

type AsaasCustomer = { id: string; name: string };
type AsaasPayment  = { id: string; customer: string; dueDate: string; value: number; netValue: number; originalValue?: number; paymentDate?: string; confirmedDate?: string };
type SupabaseEntry = { id: string; name: string; due_date: string; amount: number; status: string };

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

async function sendWhatsApp(number: string, text: string): Promise<void> {
  try { await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: EVO_KEY }, body: JSON.stringify({ number, text }) }); }
  catch (e) { console.error("sendWhatsApp:", (e as Error).message); }
}

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
  const nk = normalizeName(name), dk = normalizeIsoDate(isoDue);
  if (!nk || !dk) return null;
  return `${nk}|${dk}`;
}

function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

function expectedWithPenalty(amount: number, dueIso: string, payIso: string | null): number | null {
  if (!payIso) return round2(amount);
  const lateDays = Math.max(0, Math.round((new Date(payIso + "T00:00:00").getTime() - new Date(dueIso + "T00:00:00").getTime()) / 86400000));
  if (lateDays <= 0) return round2(amount);
  return round2(amount + amount * 0.02 + amount * 0.01 * (lateDays / 30));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const asaasCustomers = (await asaasGetAll("/customers")) as AsaasCustomer[];
    const customerNameMap = new Map<string, string>();
    for (const c of asaasCustomers) customerNameMap.set(c.id, c.name);

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const since = sixMonthsAgo.toISOString().slice(0, 10);

    const received = (await asaasGetAll(`/payments?status=RECEIVED&dueDateGe=${since}`)) as AsaasPayment[];
    const { data: pendingEntries } = await supabase.from("financial_entries").select("*").eq("status", "pending");

    if (!pendingEntries?.length || !received.length) {
      await supabase.from("automations").update({ last_triggered_at: new Date().toISOString() }).eq("jobname", "asaas-reconciliacao");
      return new Response(JSON.stringify({ success: true, matched: 0, unmatched: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    type RI = { raw: AsaasPayment; dueIso: string; payDateIso: string | null; payValue: number | null; payNet: number | null; payOriginal: number | null };
    const payIndex = new Map<string, RI[]>();

    for (const p of received) {
      const name    = customerNameMap.get(p.customer) ?? "";
      const dueIso  = normalizeIsoDate(p.dueDate);
      const key     = buildKey(name, dueIso);
      if (!key || !dueIso) continue;
      const payDateIso = p.paymentDate ? normalizeIsoDate(p.paymentDate) : p.confirmedDate ? normalizeIsoDate(p.confirmedDate) : null;
      if (!payIndex.has(key)) payIndex.set(key, []);
      payIndex.get(key)!.push({ raw: p, dueIso, payDateIso, payValue: parseBRL(p.value), payNet: parseBRL(p.netValue), payOriginal: parseBRL(p.originalValue) });
    }

    const matched:   Array<{ entryId: string; paymentId: string; clientName: string; amount: number }> = [];
    let unmatchedCount = 0;

    for (const entry of (pendingEntries as SupabaseEntry[])) {
      const dueIso = normalizeIsoDate(entry.due_date);
      const key    = buildKey(entry.name ?? "", dueIso);
      if (!key) continue;

      const list = payIndex.get(key);
      if (!list?.length) { unmatchedCount++; continue; }

      const amount = Number(entry.amount);
      if (!Number.isFinite(amount)) continue;

      let bestIdx = -1, bestScore = 99, bestDiff = Infinity;

      for (let i = 0; i < list.length; i++) {
        const c  = list[i];
        const av = [c.payValue, c.payNet, c.payOriginal].filter((v): v is number => v !== null);

        // Estratégia 1: match direto por valor
        for (const v of av) {
          const diff = Math.abs(v - amount);
          if (diff <= EPS && (bestScore > 1 || (bestScore === 1 && diff < bestDiff))) { bestScore = 1; bestDiff = diff; bestIdx = i; }
        }
        // Estratégia 2: originalValue ≈ amount
        if (c.payOriginal !== null) {
          const diff = Math.abs(c.payOriginal - amount);
          if (diff <= EPS && (bestScore > 2 || (bestScore === 2 && diff < bestDiff))) { bestScore = 2; bestDiff = diff; bestIdx = i; }
        }
        // Estratégia 3: com penalidade recalculada
        if (dueIso) {
          const exp = expectedWithPenalty(amount, dueIso, c.payDateIso);
          if (exp !== null) for (const v of av) {
            const diff = Math.abs(v - exp);
            if (diff <= EPS_PENALTY && (bestScore > 3 || (bestScore === 3 && diff < bestDiff))) { bestScore = 3; bestDiff = diff; bestIdx = i; }
          }
        }
      }

      // Estratégia 4 (fallback): único candidato com mesmo nome+data
      if (bestIdx === -1 && list.length === 1) bestIdx = 0;
      if (bestIdx === -1) { unmatchedCount++; continue; }

      const chosen = list.splice(bestIdx, 1)[0];
      matched.push({ entryId: entry.id, paymentId: chosen.raw.id, clientName: entry.name ?? "", amount });
    }

    for (const m of matched) {
      await supabase.from("financial_entries").update({ status: "paid" }).eq("id", m.entryId);
    }

    if (matched.length > 0) {
      await supabase.from("notification_logs").insert({ type: "reconciliation", channel: "system", status: "sent", metadata: { matched: matched.length, unmatched: unmatchedCount } });
    }

    // Relatório compacto — sem listar nomes dos sem-match
    if (matched.length > 0 || unmatchedCount > 0) {
      const nowBR = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      let report = `📊 *Dá Baixa no Sistema* — ${nowBR}\n\n`;
      report += `✅ *Pagamentos confirmados:* ${matched.length}\n`;
      if (matched.length > 0) {
        report += matched.map(m => `  • ${m.clientName} — R$${m.amount.toFixed(2)}`).join("\n") + "\n";
      }
      if (unmatchedCount > 0) {
        report += `\n⚠️ *Sem correspondência (revisar no sistema):* ${unmatchedCount}`;
      }
      await sendWhatsApp(ADMIN_GROUP, report);
    }

    await supabase.from("automations").update({ last_triggered_at: new Date().toISOString() }).eq("jobname", "asaas-reconciliacao");
    return new Response(JSON.stringify({ success: true, matched: matched.length, unmatched: unmatchedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-payment-reconciliation:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
