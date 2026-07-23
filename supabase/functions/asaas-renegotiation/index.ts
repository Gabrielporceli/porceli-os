import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_URL = "https://api.asaas.com/v3";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
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
        mobilePhone: phone ?? undefined,
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
    const payment = await asaasPost("/payments", paymentBody);

    return new Response(
      JSON.stringify({ success: true, payment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const e = err as Error;
    console.error("asaas-renegotiation error:", e.message);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
