import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cobranças avulsas no Asaas (renegociação e contratos com cobranças
 * personalizadas).
 *
 * action:
 *   • "create" (padrão) — cria a cobrança (ou o parcelamento) e devolve TODAS as
 *     cobranças geradas em `payments` (id, vencimento, valor), para o sistema
 *     ligar cada lançamento local ao boleto certo (asaas_payment_id).
 *   • "cancel" — remove no Asaas as cobranças `payment_ids` que ainda estão em
 *     aberto (PENDING/OVERDUE). Cobrança já paga NUNCA é removida. Usado pela
 *     renegociação: antes, os boletos antigos ficavam abertos no Asaas e o
 *     cliente seguia recebendo aviso de atraso de dívida já renegociada.
 *     (Remoção no Asaas é reversível: POST /payments/{id}/restore.)
 *   • "status" — só consulta (não altera nada).
 *
 * Exige usuário logado: a função mexe em cobranças reais.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_URL = "https://api.asaas.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

async function asaasDelete(path: string) {
  const r = await fetch(`${ASAAS_URL}${path}`, {
    method: "DELETE",
    headers: { access_token: ASAAS_KEY },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Asaas DELETE ${path}: ${r.status} — ${txt.slice(0, 200)}`);
  }
  return r.json();
}

// O campo mobilePhone do Asaas espera o formato LOCAL (DDD + número, sem
// código de país) — mandar com "55" na frente faz o Asaas truncar/corromper
// o número salvo (ver mesma correção em asaas-new-client).
function toAsaasLocalPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("55") && (clean.length === 13 || clean.length === 12)) {
    return clean.slice(2);
  }
  return clean;
}

type Pay = { id: string; status: string; dueDate: string; value: number; description?: string; deleted?: boolean; installment?: string | null };
const resumo = (p: Pay) => ({ id: p.id, status: p.status, dueDate: p.dueDate, value: p.value, description: p.description ?? null, deleted: !!p.deleted });

async function autorizado(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (SERVICE_KEY && token === SERVICE_KEY) return true;
  const { data, error } = await createClient(SUPABASE_URL, SERVICE_KEY).auth.getUser(token);
  return !error && !!data?.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!(await autorizado(req))) return json({ success: false, error: "Não autorizado" }, 401);

    const body = await req.json();
    const action = (body?.action ?? "create") as "create" | "cancel" | "status";

    // ── Consulta / remoção de cobranças existentes ─────────────────────────
    if (action === "status" || action === "cancel") {
      const ids: string[] = Array.isArray(body?.payment_ids) ? body.payment_ids.filter((x: unknown) => typeof x === "string" && x) : [];
      if (ids.length === 0) return json({ success: false, error: "payment_ids vazio" }, 400);

      const resultados: Record<string, unknown>[] = [];
      for (const id of ids) {
        try {
          const p = (await asaasGet(`/payments/${id}`)) as Pay;
          if (action === "status") { resultados.push({ ...resumo(p), resultado: "consulta" }); continue; }

          if (p.deleted) { resultados.push({ ...resumo(p), resultado: "ja_removida" }); continue; }
          if (p.status !== "PENDING" && p.status !== "OVERDUE") {
            // Paga (RECEIVED/CONFIRMED/RECEIVED_IN_CASH), estornada etc.: não mexe.
            resultados.push({ ...resumo(p), resultado: "mantida" });
            continue;
          }
          await asaasDelete(`/payments/${id}`);
          resultados.push({ ...resumo(p), resultado: "removida" });
        } catch (e) {
          resultados.push({ id, resultado: "erro", error: (e as Error).message });
        }
      }
      const erros = resultados.filter((r) => r.resultado === "erro").length;
      return json({ success: erros === 0, resultados });
    }

    // ── Criação ───────────────────────────────────────────────────────────
    const {
      cnpj,
      company_name,
      email,
      phone,
      total_amount,
      due_date,
      installments,
      billing_type,
      description,
    } = body as {
      cnpj: string;
      company_name: string;
      email?: string;
      phone?: string;
      total_amount: number;
      due_date: string;
      installments: number;
      billing_type: "BOLETO" | "PIX" | "CREDIT_CARD";
      description?: string;
    };

    // 1. Busca ou cria cliente no Asaas
    const existing = await asaasGet(`/customers?cpfCnpj=${cnpj.replace(/\D/g, "")}`);
    let asaasCustomerId: string;

    if (existing.totalCount > 0) {
      asaasCustomerId = existing.data[0].id;
    } else {
      const created = await asaasPost("/customers", {
        name: company_name,
        cpfCnpj: cnpj.replace(/\D/g, ""),
        email: email ?? undefined,
        mobilePhone: phone ? toAsaasLocalPhone(phone) : undefined,
        notificationDisabled: true,
      });
      asaasCustomerId = created.id;
    }

    // 2. Monta corpo do pagamento
    const paymentBody: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType: billing_type,
      dueDate: due_date,
      description: description || "Renegociação de pagamentos em atraso",
      notificationDisabled: true,
      interest: { value: 1 },
      fine: { value: 2 },
    };

    if (installments > 1) {
      paymentBody.installmentCount = installments;
      paymentBody.totalValue = total_amount;
    } else {
      paymentBody.value = total_amount;
    }

    // 3. Cria cobrança no Asaas
    const payment = (await asaasPost("/payments", paymentBody)) as Pay;

    // 4. Parcelado: o Asaas devolve só a 1ª parcela — busca todas, em ordem.
    let payments: Pay[] = [payment];
    if (installments > 1 && payment.installment) {
      try {
        const lista = await asaasGet(`/payments?installment=${payment.installment}&limit=100`);
        const todas = ((lista.data ?? []) as Pay[]).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        if (todas.length > 0) payments = todas;
      } catch (e) {
        console.warn("lista do parcelamento:", (e as Error).message);
      }
    }

    return json({ success: true, payment, payments: payments.map(resumo) });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-renegotiation error:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});
