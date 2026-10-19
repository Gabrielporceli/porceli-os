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
 *   • "preview_removal" / "cancel" — recebe `entry_ids` (lançamentos locais da
 *     renegociação). O servidor relê cada lançamento no banco (não confia na
 *     tela) e só remove o boleto do Asaas se TUDO bater:
 *       1. o lançamento tem asaas_payment_id e nenhum outro aponta pro mesmo;
 *       2. o boleto é do MESMO cliente (cliente Asaas do CNPJ do lançamento);
 *       3. mesmo valor (±R$ 0,01) e mesmo vencimento (ou vencimento original);
 *       4. está vencido (OVERDUE, ou PENDING com vencimento até hoje);
 *       5. não está pago nem já removido.
 *     Qualquer divergência → NÃO remove e devolve o motivo. "preview_removal"
 *     só confere (a tela mostra a lista pra aprovação); "cancel" confere de
 *     novo e remove, registrando em asaas_removals (dá pra restaurar no Asaas:
 *     POST /payments/{id}/restore).
 *     Antes, os boletos antigos ficavam abertos e o cliente seguia recebendo
 *     aviso de atraso de dívida já renegociada.
 *   • "status" — só consulta `payment_ids` (não altera nada).
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

type Pay = {
  id: string; status: string; dueDate: string; originalDueDate?: string; value: number; originalValue?: number | null;
  description?: string; deleted?: boolean; installment?: string | null; customer?: string;
};
const resumo = (p: Pay) => ({ id: p.id, status: p.status, dueDate: p.dueDate, value: p.value, description: p.description ?? null, deleted: !!p.deleted });

const db = createClient(SUPABASE_URL, SERVICE_KEY);

/** null = não autorizado; "service" = chamada interna; senão o id do usuário. */
async function quemChama(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (SERVICE_KEY && token === SERVICE_KEY) return "service";
  const { data, error } = await db.auth.getUser(token);
  return !error && data?.user ? data.user.id : null;
}

const hojeBRT = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

type Checagem = {
  entry_id: string;
  payment_id: string | null;
  ok: boolean;
  motivo?: string;
  value?: number;
  dueDate?: string;
  description?: string | null;
  client_id?: string;
};

type Entrada = {
  id: string; client_id: string; amount: number; due_date: string;
  asaas_payment_id: string | null; clients: { cnpj: string | null } | null;
};

/** Confere, um a um, se o boleto ligado a cada lançamento pode ser removido. */
async function conferir(entryIds: string[], userId: string): Promise<Checagem[]> {
  let q = db.from("financial_entries")
    .select("id, client_id, user_id, amount, due_date, asaas_payment_id, clients(cnpj)")
    .in("id", entryIds);
  if (userId !== "service") q = q.eq("user_id", userId);
  const { data: entries, error } = await q;
  if (error) throw new Error(`lançamentos: ${error.message}`);

  const customerPorCnpj = new Map<string, string | null>();
  const out: Checagem[] = [];
  for (const id of entryIds) {
    const e = ((entries ?? []) as unknown as Entrada[]).find((x) => x.id === id);
    if (!e) { out.push({ entry_id: id, payment_id: null, ok: false, motivo: "lançamento não encontrado" }); continue; }
    const pid = e.asaas_payment_id;
    const base = { entry_id: id, payment_id: pid, client_id: e.client_id };
    if (!pid) { out.push({ ...base, ok: false, motivo: "lançamento sem vínculo com o Asaas" }); continue; }

    // 1. ninguém mais aponta pro mesmo boleto
    const { count } = await db.from("financial_entries").select("id", { count: "exact", head: true })
      .eq("asaas_payment_id", pid).neq("id", id);
    if ((count ?? 0) > 0) { out.push({ ...base, ok: false, motivo: "outro lançamento aponta para o mesmo boleto" }); continue; }

    let p: Pay;
    try { p = (await asaasGet(`/payments/${pid}`)) as Pay; }
    catch (err) { out.push({ ...base, ok: false, motivo: `não achei o boleto no Asaas (${(err as Error).message})` }); continue; }
    const det = { value: p.value, dueDate: p.dueDate, description: p.description ?? null };

    // 2. mesmo cliente
    const cnpj = (e.clients?.cnpj ?? "").replace(/\D/g, "");
    if (!cnpj) { out.push({ ...base, ...det, ok: false, motivo: "cliente sem CNPJ — não dá para confirmar o dono do boleto" }); continue; }
    if (!customerPorCnpj.has(cnpj)) {
      const c = await asaasGet(`/customers?cpfCnpj=${cnpj}`);
      customerPorCnpj.set(cnpj, c.totalCount > 0 ? c.data[0].id : null);
    }
    if (!p.customer || p.customer !== customerPorCnpj.get(cnpj)) {
      out.push({ ...base, ...det, ok: false, motivo: "o boleto é de OUTRO cliente no Asaas" }); continue;
    }

    // 3. mesmo valor e vencimento
    const valorOk = [p.value, p.originalValue].some((v) => v != null && Math.abs(Number(v) - Number(e.amount)) <= 0.01);
    if (!valorOk) {
      out.push({ ...base, ...det, ok: false, motivo: `valor diferente (sistema R$ ${Number(e.amount).toFixed(2)}, Asaas R$ ${Number(p.value).toFixed(2)})` });
      continue;
    }
    if (p.dueDate !== e.due_date && p.originalDueDate !== e.due_date) {
      out.push({ ...base, ...det, ok: false, motivo: `vencimento diferente (sistema ${e.due_date}, Asaas ${p.dueDate})` });
      continue;
    }

    // 4/5. situação
    if (p.deleted) { out.push({ ...base, ...det, ok: false, motivo: "já removido no Asaas" }); continue; }
    if (p.status === "OVERDUE" || (p.status === "PENDING" && p.dueDate <= hojeBRT())) {
      out.push({ ...base, ...det, ok: true });
    } else if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status)) {
      out.push({ ...base, ...det, ok: false, motivo: "já está PAGO no Asaas" });
    } else {
      out.push({ ...base, ...det, ok: false, motivo: `situação ${p.status} — só boleto vencido é removido` });
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const quem = await quemChama(req);
    if (!quem) return json({ success: false, error: "Não autorizado" }, 401);

    const body = await req.json();
    const action = (body?.action ?? "create") as "create" | "preview_removal" | "cancel" | "status";

    // ── Só consulta ───────────────────────────────────────────────────────
    if (action === "status") {
      const ids: string[] = Array.isArray(body?.payment_ids) ? body.payment_ids.filter((x: unknown) => typeof x === "string" && x) : [];
      if (ids.length === 0) return json({ success: false, error: "payment_ids vazio" }, 400);
      const resultados: Record<string, unknown>[] = [];
      for (const id of ids) {
        try { resultados.push(resumo((await asaasGet(`/payments/${id}`)) as Pay)); }
        catch (e) { resultados.push({ id, error: (e as Error).message }); }
      }
      return json({ success: true, resultados });
    }

    // ── Conferência / remoção dos boletos antigos da renegociação ────────────
    if (action === "preview_removal" || action === "cancel") {
      const entryIds: string[] = Array.isArray(body?.entry_ids) ? body.entry_ids.filter((x: unknown) => typeof x === "string" && x) : [];
      if (entryIds.length === 0) return json({ success: false, error: "entry_ids vazio" }, 400);

      const checagens = await conferir(entryIds, quem);
      if (action === "preview_removal") return json({ success: true, checagens });

      const resultados: (Checagem & { removido: boolean; erro?: string })[] = [];
      for (const c of checagens) {
        if (!c.ok || !c.payment_id) { resultados.push({ ...c, removido: false }); continue; }
        try {
          await asaasDelete(`/payments/${c.payment_id}`);
          await db.from("asaas_removals").insert({
            entry_id: c.entry_id, client_id: c.client_id, asaas_payment_id: c.payment_id,
            value: c.value, due_date: c.dueDate, description: c.description,
            motivo: body?.motivo ?? "renegociação", removed_by: quem === "service" ? null : quem,
          });
          resultados.push({ ...c, removido: true });
        } catch (e) {
          resultados.push({ ...c, removido: false, erro: (e as Error).message });
        }
      }
      return json({ success: !resultados.some((x) => x.erro), resultados });
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
