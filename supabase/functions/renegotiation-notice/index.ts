import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Avisa o cliente, por WhatsApp, das cobranças novas geradas no sistema —
 * numa RENEGOCIAÇÃO ou num CONTRATO com pagamentos personalizados: valor e
 * vencimento de cada cobrança + o link de pagamento do Asaas.
 *
 * Entrada: { client_id, tipo?, servico?, since?, dry_run?, correcao? }
 *   • client_id — cliente (de onde saem telefone, CNPJ e nome)
 *   • tipo      — "renegociacao" (padrão) ou "contrato"
 *   • servico   — nome do serviço do contrato (só no tipo "contrato")
 *   • since     — ISO; só entram cobranças do Asaas criadas a partir desta data
 *                 (padrão: as últimas 24h)
 *   • dry_run   — true = só monta a mensagem e devolve, sem enviar
 *   • correcao  — true = abre a mensagem como ajuste de um aviso anterior
 *
 * Cartão parcelado: o cliente informa o cartão UMA vez e o Asaas cobra as
 * parcelas sozinho — então a mensagem mostra o total em Nx e um link só, em vez
 * de um link por parcela (que faria parecer que são vários pagamentos).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_BASE = "https://api.asaas.com/v3";
const EVO_URL = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE = "agencia03";
// Mesma chave fixa das outras funções de envio (o secret EVOLUTION_API_KEY do
// projeto tem outro valor e devolve 401 — ver asaas-payment-alerts).
const EVO_KEY = "E42F543C93BB-4A59-B3A1-8AA2E506DC00";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

function formatPhoneBR(phone: string): string {
  const c = phone.replace(/\D/g, "");
  if (c.startsWith("55") && (c.length === 13 || c.length === 12)) return `+${c}`;
  if (c.length === 11 || c.length === 10) return `+55${c}`;
  return phone;
}

async function asaasGet(path: string) {
  const r = await fetch(`${ASAAS_BASE}${path}`, { headers: { access_token: ASAAS_KEY } });
  if (!r.ok) throw new Error(`Asaas GET ${path}: ${r.status}`);
  return r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { client_id, tipo = "renegociacao", servico, since, dry_run, correcao } = await req.json();
    if (!client_id) return json({ success: false, error: "client_id obrigatório" }, 400);
    const contrato = tipo === "contrato";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("company, cnpj, phone, responsible")
      .eq("id", client_id)
      .single();
    if (cErr || !client) return json({ success: false, error: "Cliente não encontrado" }, 404);
    if (!client.cnpj) return json({ success: false, error: "Cliente sem CNPJ — não dá para achar as cobranças no Asaas" }, 422);
    if (!client.phone) return json({ success: false, error: "Cliente sem telefone" }, 422);

    const cnpj = String(client.cnpj).replace(/\D/g, "");
    const customers = await asaasGet(`/customers?cpfCnpj=${cnpj}`);
    if (!customers.totalCount) return json({ success: false, error: "Cliente não encontrado no Asaas" }, 404);
    const customerId = customers.data[0].id as string;

    // Cobranças abertas (a vencer ou já vencidas — um contrato pode ter
    // pagamento com data passada) criadas a partir de `since`.
    const desde = (since ? new Date(since) : new Date(Date.now() - 24 * 3600 * 1000)).toISOString().slice(0, 10);
    type Pay = { id: string; value: number; dueDate: string; description?: string; dateCreated: string; invoiceUrl?: string; billingType?: string; installment?: string | null };
    const abertas: Pay[] = [];
    for (const status of ["PENDING", "OVERDUE"]) {
      const lista = await asaasGet(`/payments?customer=${customerId}&status=${status}&limit=100`);
      abertas.push(...((lista.data ?? []) as Pay[]));
    }
    const pertence = (p: Pay) => {
      const d = (p.description ?? "").toLowerCase();
      return contrato ? d.includes("— pagamento ") : d.includes("renegocia");
    };
    const pagamentos = abertas
      .filter((p) => pertence(p) && p.dateCreated >= desde)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (pagamentos.length === 0) {
      return json({ success: false, error: `Nenhuma cobrança ${contrato ? "do contrato" : "de renegociação"} recente encontrada no Asaas` }, 404);
    }

    const nome = (client.responsible ?? "").trim().split(" ")[0] || "";
    const total = pagamentos.reduce((s, p) => s + Number(p.value), 0);

    // Agrupa: parcelamento no cartão vira UM bloco (um link); o resto, um bloco por cobrança.
    const blocos: string[] = [];
    const usados = new Set<string>();
    for (const p of pagamentos) {
      if (usados.has(p.id)) continue;
      if (p.billingType === "CREDIT_CARD" && p.installment) {
        const grupo = pagamentos.filter((x) => x.installment === p.installment);
        grupo.forEach((x) => usados.add(x.id));
        const soma = grupo.reduce((s, x) => s + Number(x.value), 0);
        blocos.push(
          `*Pagamento no cartão:* ${fmtBRL(soma)} em *${grupo.length}x*\n` +
          `Link para pagamento: ${grupo[0].invoiceUrl ?? "(indisponível)"}`
        );
      } else {
        usados.add(p.id);
        blocos.push(
          `*Vencimento ${fmtDate(p.dueDate)}*\nValor: ${fmtBRL(p.value)}\nLink para pagamento: ${p.invoiceUrl ?? "(indisponível)"}`
        );
      }
    }
    // Várias cobranças avulsas (boleto/PIX): numera como parcelas.
    const avulsas = blocos.filter((b) => b.startsWith("*Vencimento"));
    let n = 0;
    const blocosFinais = blocos.map((b) =>
      b.startsWith("*Vencimento") && avulsas.length > 1 ? b.replace("*Vencimento", `*Parcela ${++n}/${avulsas.length}* — *Vencimento`) : b
    );

    const saudacao = `Olá${nome ? `, ${nome}` : ""}!`;
    const abertura = correcao
      ? `${saudacao} Só um ajuste na mensagem anterior 😊\n\nSeguem as condições corretas:\n\n`
      : contrato
        ? `${saudacao} 😊\n\nSeu contrato com a *Porceli Company* foi registrado. Seguem as cobranças:\n\n`
        : `${saudacao} 😊\n\nConforme combinado, a renegociação dos seus pagamentos foi concluída. Seguem as novas condições:\n\n`;

    const mensagem =
      abertura +
      `*Cliente:* ${client.company}\n` +
      (contrato && servico ? `*Serviço:* ${servico}\n` : "") +
      (blocosFinais.length > 1 ? `*Total${contrato ? "" : " renegociado"}:* ${fmtBRL(total)}\n` : "") +
      `\n${blocosFinais.join("\n\n")}\n\n` +
      `Qualquer dúvida é só responder por aqui. Obrigado! 🙏`;

    if (dry_run) return json({ success: true, dry_run: true, mensagem, pagamentos: pagamentos.length });

    // Envio (Evolution API) — confere a resposta, para não "achar" que enviou.
    const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number: formatPhoneBR(client.phone), text: mensagem }),
    });
    const ok = r.ok;
    const erro = ok ? undefined : `Evolution API ${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`;

    // Registro (best effort — não derruba o envio se a tabela recusar)
    try {
      await supabase.from("notification_logs").insert({
        asaas_customer_id: customerId,
        client_name: client.company,
        type: contrato ? "contract_custom" : "renegotiation",
        channel: "whatsapp",
        asaas_payment_id: pagamentos[0].id,
        status: ok ? "sent" : "failed",
        error_message: erro,
        metadata: { pagamentos: pagamentos.map((p) => p.id), correcao: !!correcao },
      });
    } catch (e) {
      console.warn("notification_logs:", (e as Error).message);
    }

    if (!ok) return json({ success: false, error: erro }, 502);
    return json({ success: true, enviado_para: formatPhoneBR(client.phone), pagamentos: pagamentos.length });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("renegotiation-notice error:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});
