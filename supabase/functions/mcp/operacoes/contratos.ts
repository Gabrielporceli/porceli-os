// Contratos — o mesmo passo a passo da tela (src/hooks/useContracts.ts e
// src/pages/Contracts.tsx). Criar um contrato não é gravar uma linha: é
// gravar, sincronizar o cliente, gerar os lançamentos e mandar ao Asaas.
import { db, dono, exigir, Ferramenta, hojeSP, invocar, parametros } from "../contexto.ts";
import { atualizarLancamentosDoCliente, gerarLancamentosDoCliente, valorMensalTotal } from "../lancamentos.ts";

type Pagamento = { dueDate: string; amount: number; billingType: "BOLETO" | "PIX" | "CREDIT_CARD" };

/** Cliente com os campos de contrato atualizados — passo 2 de criar/editar. */
async function sincronizarCliente(clientId: string, userId: string, contrato: Record<string, unknown>, paymentDay?: number) {
  const { data: todos } = await db.from("contracts")
    .select("monthly_value, status, end_date, start_date").eq("client_id", clientId).eq("user_id", userId);
  const updates: Record<string, unknown> = {
    start_date: contrato.start_date,
    contract_end: contrato.end_date,
    monthly_value: valorMensalTotal(todos ?? []) || contrato.monthly_value,
    plan: contrato.type,
    updated_at: new Date().toISOString(),
  };
  if (paymentDay !== undefined) updates.payment_day = paymentDay;
  await db.from("clients").update(updates).eq("id", clientId).eq("user_id", userId);
}

async function criarContrato(a: {
  cliente_id: string; tipo: string; valor_mensal?: number; data_inicio?: string; data_fim?: string;
  dia_pagamento?: number; status?: string; link_contrato?: string; pagamento_unico?: boolean;
  categoria?: "recorrente" | "pontual" | "rescisao"; forma_cobranca?: Pagamento["billingType"];
  pagamentos_personalizados?: Pagamento[];
}) {
  const { id: userId } = await dono();
  exigir(a.cliente_id, "cliente_id é obrigatório");
  exigir(a.tipo?.trim(), "tipo (serviço) é obrigatório");
  const avisos: string[] = [];
  const hoje = hojeSP();
  const categoria = a.categoria ?? "recorrente";

  // Monta o contrato como o NewContractModal monta.
  let contrato: Record<string, unknown>;
  let paymentDay: number;
  let billingType: string;
  const custom = a.pagamentos_personalizados?.length ? [...a.pagamentos_personalizados] : null;
  if (custom) {
    if (custom.some((p) => !(p.amount > 0) || !p.dueDate)) throw new Error("Preencha valor e vencimento em todos os pagamentos.");
    if (custom.some((p) => p.dueDate < hoje)) throw new Error("Há pagamento com vencimento no passado. O Asaas não aceita.");
    custom.sort((x, y) => x.dueDate.localeCompare(y.dueDate));
    paymentDay = Math.min(28, parseInt(custom[0].dueDate.slice(8, 10), 10) || 1);
    billingType = custom[0].billingType ?? "BOLETO";
    contrato = {
      client_id: a.cliente_id, type: a.tipo,
      monthly_value: custom.reduce((s, p) => s + p.amount, 0), // o TOTAL; as cobranças saem da lista
      start_date: custom[0].dueDate, end_date: custom[custom.length - 1].dueDate,
      status: a.status ?? "active", contract_url: a.link_contrato ?? "",
      single_payment: true, category: categoria === "recorrente" ? "pontual" : categoria,
      custom_payments: custom,
    };
  } else {
    if (!(Number(a.valor_mensal) > 0)) throw new Error("valor_mensal (número em reais) é obrigatório");
    const inicio = exigir(a.data_inicio, "data_inicio é obrigatória");
    const unico = !!a.pagamento_unico;
    if (!unico) exigir(a.data_fim, "data_fim é obrigatória (ou pagamento_unico: true)");
    paymentDay = a.dia_pagamento || 1;
    if (paymentDay < 1 || paymentDay > 28) throw new Error("dia_pagamento vai de 1 a 28");
    billingType = a.forma_cobranca ?? "BOLETO";
    contrato = {
      client_id: a.cliente_id, type: a.tipo, monthly_value: Number(a.valor_mensal),
      start_date: inicio, end_date: unico ? inicio : a.data_fim,
      status: a.status ?? "active", contract_url: a.link_contrato ?? "",
      single_payment: unico, category: unico && categoria === "recorrente" ? "pontual" : categoria,
    };
  }

  // 1. Grava o contrato.
  const { data, error } = await db.from("contracts").insert({ ...contrato, user_id: userId })
    .select("*, client:clients(*)").single();
  if (error) throw new Error(`contrato: ${error.message}`);
  // deno-lint-ignore no-explicit-any
  const c = data as any;
  const passos: string[] = ["contrato gravado"];

  // 2. Cliente com os dados do contrato.
  await sincronizarCliente(c.client_id, userId, c, paymentDay);
  passos.push("cliente atualizado");

  // 3. Lançamentos no financeiro.
  try {
    const n = await gerarLancamentosDoCliente(c.client_id, userId);
    passos.push(`${n} lançamento(s) gerado(s)`);
  } catch (e) {
    avisos.push(`lançamentos não gerados: ${(e as Error).message}`);
  }

  // 4a. Pagamentos personalizados: uma cobrança no Asaas por pagamento + aviso.
  if (custom) {
    const cli = c.client;
    if (!cli?.cnpj) {
      avisos.push("Cliente sem CNPJ: cobranças no Asaas ignoradas (os lançamentos locais foram criados).");
      return { contrato_id: c.id, passos, avisos };
    }
    let falhas = 0;
    const inicio = new Date(Date.now() - 60_000).toISOString();
    for (const [i, pay] of custom.entries()) {
      const ref = `porceli:contrato:${c.id}:${i + 1}`;
      const res = await invocar("asaas-renegotiation", {
        cnpj: cli.cnpj, company_name: cli.company, email: cli.email, phone: cli.phone,
        billing_type: pay.billingType, total_amount: pay.amount, due_date: pay.dueDate, installments: 1,
        description: `${c.type} — Pagamento ${i + 1}/${custom.length} — ${cli.company}`, external_reference: ref,
      }).catch((e) => ({ success: false, error: (e as Error).message }));
      if (!res?.success) { falhas++; avisos.push(`Asaas pagamento ${i + 1}: ${res?.error ?? "falhou"}`); continue; }
      const boletoId = res.payments?.[0]?.id ?? res.payment?.id;
      if (boletoId) {
        await db.from("financial_entries")
          .update({ asaas_payment_id: boletoId, asaas_link_origin: "criacao", asaas_external_ref: ref })
          .eq("client_id", c.client_id).eq("due_date", pay.dueDate).eq("amount", pay.amount)
          .eq("reference", `${c.type} — Pagamento ${i + 1}/${custom.length}`).is("asaas_payment_id", null);
      }
    }
    passos.push(`${custom.length - falhas} de ${custom.length} cobrança(s) criadas no Asaas`);
    if (falhas < custom.length) {
      const aviso = await invocar("renegotiation-notice", { client_id: c.client_id, tipo: "contrato", servico: c.type, since: inicio })
        .catch((e) => ({ success: false, error: (e as Error).message }));
      if (aviso?.success) passos.push("cliente avisado por WhatsApp");
      else avisos.push("Contrato criado, mas o aviso por WhatsApp não foi enviado.");
    }
    return { contrato_id: c.id, passos, avisos };
  }

  // 4b. Mensalidade / pagamento único: o webhook cria cliente e cobranças no Asaas.
  const finalPaymentDay = a.dia_pagamento ?? (c.client?.payment_day || 1);
  const r = await invocar("send-client-webhook", {
    ...c.client, plan: c.type, contract_end: c.end_date, start_date: c.start_date,
    payment_day: finalPaymentDay, monthly_value: c.monthly_value, single_payment: c.single_payment,
    billing_type: billingType, contract_id: c.id, event: "contract_created", updated_at: new Date().toISOString(),
  }).catch((e) => ({ success: false, error: (e as Error).message }));
  if (r?.success === false) avisos.push(`Asaas: ${r.error ?? "o envio falhou"}`);
  else passos.push("enviado ao Asaas (cobranças)");

  return { contrato_id: c.id, passos, avisos };
}

async function editarContrato(a: {
  contrato_id: string; tipo?: string; valor_mensal?: number; data_inicio?: string; data_fim?: string;
  status?: string; dia_pagamento?: number; link_contrato?: string; categoria?: string;
  remover_boletos_antigos?: string[];
}, viaModal = true) {
  // viaModal: a tela de EDIÇÃO marca o cliente Inativo ao salvar um contrato
  // inativo; o CANCELAMENTO (encerrar_contrato) chama a mesma mutação sem
  // isso — senão o gatilho sync_client_contract_status inativaria todos os
  // contratos do cliente, inclusive os que continuam valendo.
  const { id: userId } = await dono();
  exigir(a.contrato_id, "contrato_id é obrigatório");
  const avisos: string[] = [];
  const passos: string[] = [];

  const { data: before } = await db.from("contracts")
    .select("monthly_value, start_date, end_date, status, client_id, client:clients(payment_day)").eq("id", a.contrato_id).single();
  // deno-lint-ignore no-explicit-any
  const antes = before as any;
  if (!antes) throw new Error("Contrato não encontrado");

  const updates: Record<string, unknown> = {};
  if (a.tipo !== undefined) updates.type = a.tipo;
  if (a.valor_mensal !== undefined) updates.monthly_value = a.valor_mensal;
  if (a.data_inicio !== undefined) updates.start_date = a.data_inicio;
  if (a.data_fim !== undefined) updates.end_date = a.data_fim;
  if (a.status !== undefined) updates.status = a.status;
  if (a.link_contrato !== undefined) updates.contract_url = a.link_contrato;
  if (a.categoria !== undefined) updates.category = a.categoria;

  const mudouCobranca =
    (a.valor_mensal !== undefined && Math.abs(Number(a.valor_mensal) - Number(antes.monthly_value)) > 0.001) ||
    (a.data_inicio !== undefined && a.data_inicio !== antes.start_date) ||
    (a.data_fim !== undefined && a.data_fim !== antes.end_date) ||
    (a.dia_pagamento !== undefined && a.dia_pagamento !== antes.client?.payment_day);
  const statusFinal = a.status ?? antes.status;

  // Etapa de revisão (como o modal): mudou o que gera cobrança → primeiro
  // mostra os boletos futuros do parcelamento anterior. Nada é gravado aqui.
  if (mudouCobranca && statusFinal !== "inactive" && a.remover_boletos_antigos === undefined) {
    const prev = await invocar("asaas-renegotiation", { action: "preview_contract_removal", contract_id: a.contrato_id });
    if (!prev?.success) throw new Error(`Não consegui conferir os boletos no Asaas: ${prev?.error ?? "erro"}`);
    return {
      precisa_confirmar: true,
      explicacao: "A edição muda valor/datas/dia de pagamento: o Asaas vai ganhar um parcelamento novo. " +
        "Repita editar_contrato com os mesmos campos e remover_boletos_antigos = lista de payment_id (só os ok: true) " +
        "a remover depois que o novo for criado, ou [] para manter todos.",
      boletos_atuais: prev.boletos ?? [],
      sem_codigo: !!prev.sem_codigo,
    };
  }

  // O modal marca o cliente como Inativo antes de salvar um contrato inativo.
  if (viaModal && a.status === "inactive" && antes.client_id) {
    await db.from("clients").update({ tags: ["Inativo"] }).eq("id", antes.client_id).eq("user_id", userId);
    passos.push("cliente marcado Inativo");
  }

  const { data, error } = await db.from("contracts").update(updates).eq("id", a.contrato_id)
    .select("*, client:clients(*)").single();
  if (error) throw new Error(`contrato: ${error.message}`);
  // deno-lint-ignore no-explicit-any
  const c = data as any;
  passos.push("contrato atualizado");

  if (c.client_id) {
    await sincronizarCliente(c.client_id, userId, c, a.dia_pagamento);
    passos.push("cliente atualizado");

    if (mudouCobranca) {
      try {
        const n = await atualizarLancamentosDoCliente(c.client_id, userId);
        passos.push(`lançamentos refeitos (${n} novo(s))`);
      } catch (e) {
        avisos.push(`lançamentos: ${(e as Error).message}`);
      }
    }

    // Asaas só se mudou o que gera cobrança — e nunca ao cancelar.
    if (a.status !== "inactive" && mudouCobranca) {
      const finalPaymentDay = a.dia_pagamento ?? (c.client?.payment_day || 1);
      const novo = await invocar("send-client-webhook", {
        ...c.client, plan: c.type, contract_end: c.end_date, start_date: c.start_date,
        payment_day: finalPaymentDay, monthly_value: c.monthly_value, contract_id: c.id,
        event: "contract_updated", updated_at: new Date().toISOString(),
      }).catch((e) => ({ success: false, error: (e as Error).message }));
      passos.push("novo parcelamento enviado ao Asaas");

      const remover = a.remover_boletos_antigos ?? [];
      if (remover.length > 0) {
        if (!novo?.success) {
          avisos.push("O novo parcelamento não foi criado no Asaas — os boletos antigos foram MANTIDOS. Confira no Asaas.");
        } else {
          const rem = await invocar("asaas-renegotiation", { action: "cancel_contract_payments", contract_id: c.id, payment_ids: remover })
            .catch(() => null);
          const removidos = ((rem?.resultados ?? []) as { removido: boolean }[]).filter((x) => x.removido).length;
          if (!rem) avisos.push("Não foi possível remover os boletos antigos no Asaas — confira manualmente.");
          else {
            passos.push(`${removidos} boleto(s) antigo(s) removido(s) no Asaas`);
            if (removidos < remover.length) avisos.push(`${remover.length - removidos} boleto(s) antigo(s) não foram removidos — confira no Asaas.`);
          }
        }
      }
    }
  }
  return { contrato_id: c.id, passos, avisos };
}

async function renovarContrato(a: {
  contrato_id: string; tipo?: string; valor_mensal?: number; data_inicio?: string; data_fim?: string;
  dia_pagamento?: number; link_contrato?: string; pagamento_unico?: boolean;
}) {
  const { id: userId } = await dono();
  const avisos: string[] = [];
  const passos: string[] = [];
  const { data: atual } = await db.from("contracts").select("*, client:clients(*)")
    .eq("id", exigir(a.contrato_id, "contrato_id é obrigatório")).eq("user_id", userId).single();
  // deno-lint-ignore no-explicit-any
  const cur = atual as any;
  if (!cur) throw new Error("Contrato não encontrado");

  // Mesmas datas padrão da tela: começa no dia seguinte ao fim, mesma duração.
  const dias = Math.ceil((new Date(cur.end_date).getTime() - new Date(cur.start_date).getTime()) / 86_400_000);
  const inicio = a.data_inicio || (() => { const d = new Date(cur.end_date); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();
  const fim = a.data_fim || (() => { const d = new Date(inicio); d.setDate(d.getDate() + dias); return d.toISOString().split("T")[0]; })();
  const tipo = a.tipo || cur.type;
  const valor = a.valor_mensal !== undefined ? a.valor_mensal : cur.monthly_value;

  // O contrato anterior NÃO é inativado na renovação (decisão do dono).
  const { data: novo, error } = await db.from("contracts").insert({
    user_id: userId, client_id: cur.client_id, type: tipo, monthly_value: valor,
    start_date: inicio, end_date: fim, status: "active", contract_url: a.link_contrato,
    single_payment: a.pagamento_unico ?? false,
  }).select("*, client:clients(*)").single();
  if (error) throw new Error(`renovação: ${error.message}`);
  // deno-lint-ignore no-explicit-any
  const n = novo as any;
  passos.push("contrato renovado criado");

  const finalPaymentDay = a.dia_pagamento ?? (cur.client?.payment_day || 1);
  if (n.client_id) {
    await db.from("clients").update({
      start_date: inicio, contract_end: fim, monthly_value: valor, plan: tipo,
      payment_day: finalPaymentDay, tags: ["Ativo"], updated_at: new Date().toISOString(),
    }).eq("id", n.client_id).eq("user_id", userId);
    passos.push("cliente atualizado (Ativo)");
    try {
      const q = await gerarLancamentosDoCliente(n.client_id, userId);
      passos.push(`${q} lançamento(s) gerado(s)`);
    } catch (e) {
      avisos.push(`lançamentos: ${(e as Error).message}`);
    }
  }

  if (n.client) {
    const cl = n.client;
    const r = await invocar("send-client-webhook", {
      id: cl.id, company: cl.company, cnpj: cl.cnpj, responsible: cl.responsible, phone: cl.phone,
      email: cl.email, group_id: cl.group_id, plan: cl.plan, contract_end: n.end_date, start_date: n.start_date,
      payment_day: a.dia_pagamento ?? (cl.payment_day || 1), monthly_value: n.monthly_value,
      single_payment: n.single_payment, address: cl.address, tags: cl.tags, user_id: cl.user_id,
      created_at: n.created_at, updated_at: n.updated_at, contract_id: n.id, event: "contract_renewed",
      previous_contract_end: cur.end_date, contract_duration_days: dias,
    }).catch((e) => ({ success: false, error: (e as Error).message }));
    if (r?.success === false) avisos.push(`Asaas: ${r.error ?? "falhou"}`);
    else passos.push("enviado ao Asaas (cobranças)");
  }
  return { contrato_id: n.id, passos, avisos };
}

async function encerrarContrato(a: { contrato_id: string; multa_valor?: number; multa_vencimento?: string }) {
  const { id: userId } = await dono();
  const passos: string[] = [];
  const avisos: string[] = [];
  const { data: ct } = await db.from("contracts").select("*, client:clients(company, cnpj, email, phone)")
    .eq("id", exigir(a.contrato_id, "contrato_id é obrigatório")).single();
  // deno-lint-ignore no-explicit-any
  const contrato = ct as any;
  if (!contrato) throw new Error("Contrato não encontrado");
  const temMulta = a.multa_valor !== undefined && a.multa_valor > 0;
  if (temMulta) exigir(a.multa_vencimento, "multa_vencimento é obrigatório quando há multa");

  // Base do cancelamento (cancelContractBase): status inativo pelo mesmo
  // caminho de "editar" (sem mudar cobrança: não mexe no Asaas).
  await editarContrato({ contrato_id: contrato.id, status: "inactive" }, false);
  passos.push("contrato inativado");

  if (contrato.client_id) {
    const { data: restantes } = await db.from("contracts").select("id, status, end_date")
      .eq("client_id", contrato.client_id).eq("user_id", userId).neq("id", contrato.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const temAtivo = (restantes || []).some((c) =>
      c.status === "active" || c.status === "expiring" || (c.end_date ? new Date(c.end_date) >= today : false));
    if (temAtivo) {
      // Cliente segue ativo: não mexe na tag (o gatilho cancelaria tudo); só refaz as faturas.
      await atualizarLancamentosDoCliente(contrato.client_id, userId);
      passos.push("faturas refeitas a partir dos contratos que continuam ativos");
    } else {
      await db.from("clients").update({ tags: ["Inativo"] }).eq("id", contrato.client_id).eq("user_id", userId);
      await db.from("financial_entries").delete()
        .eq("client_id", contrato.client_id).eq("user_id", userId).eq("status", "pending");
      passos.push("cliente marcado Inativo e faturas pendentes removidas");
    }
  }

  if (temMulta && contrato.client_id) {
    const nomeCliente = contrato.client?.company ?? "";
    const { data: fineRow, error: fineError } = await db.from("financial_entries").insert({
      client_id: contrato.client_id, user_id: userId, name: `Multa Rescisória — ${nomeCliente}`,
      amount: a.multa_valor, due_date: a.multa_vencimento, reference: "Multa Rescisória", status: "pending",
    }).select("id").single();
    if (fineError) avisos.push(`multa: ${fineError.message}`);
    else passos.push("multa lançada no financeiro");

    if (contrato.client?.cnpj) {
      const multaRef = `porceli:multa:${contrato.id}`;
      const r = await invocar("asaas-renegotiation", {
        cnpj: contrato.client.cnpj, company_name: contrato.client.company, email: contrato.client.email,
        phone: contrato.client.phone, total_amount: a.multa_valor, due_date: a.multa_vencimento,
        installments: 1, billing_type: "BOLETO", description: `Multa Rescisória — ${nomeCliente}`, external_reference: multaRef,
      }).catch((e) => ({ success: false, error: (e as Error).message }));
      if (!r?.success) avisos.push(`Cobrança da multa no Asaas falhou: ${r?.error ?? "erro"}`);
      else {
        passos.push("cobrança da multa criada no Asaas");
        const boletoId = r.payments?.[0]?.id ?? r.payment?.id;
        if (boletoId && fineRow?.id) {
          await db.from("financial_entries")
            .update({ asaas_payment_id: boletoId, asaas_link_origin: "criacao", asaas_external_ref: multaRef }).eq("id", fineRow.id);
        }
      }
    } else {
      avisos.push("Cliente sem CNPJ — multa gravada só no sistema, sem cobrança no Asaas.");
    }
  }
  return { contrato_id: contrato.id, passos, avisos };
}

async function excluirContrato(a: { contrato_id: string }) {
  const { id: userId } = await dono();
  const { data: contrato } = await db.from("contracts").select("id, client_id").eq("id", exigir(a.contrato_id, "contrato_id é obrigatório")).single();
  if (!contrato) throw new Error("Contrato não encontrado");
  const { error } = await db.from("contracts").delete().eq("id", contrato.id);
  if (error) throw new Error(error.message);
  const passos = ["contrato excluído"];
  if (contrato.client_id) {
    const { data: rest } = await db.from("contracts").select("status, end_date")
      .eq("client_id", contrato.client_id).eq("user_id", userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if ((rest || []).some((c) => c.status === "active" || c.status === "expiring" || (c.end_date ? new Date(c.end_date) >= today : false))) {
      await db.from("clients").update({ tags: ["Ativo"], updated_at: new Date().toISOString() })
        .eq("id", contrato.client_id).eq("user_id", userId);
      passos.push("cliente segue Ativo (tem outro contrato)");
    }
  }
  return { passos, avisos: [] };
}

const pagamentoSchema = {
  type: "array",
  description: "Cobrança personalizada: cada pagamento com valor (reais), vencimento (YYYY-MM-DD, não pode ser passado) e forma.",
  items: parametros({
    dueDate: { type: "string" }, amount: { type: "number" },
    billingType: { type: "string", enum: ["BOLETO", "PIX", "CREDIT_CARD"] },
  }, ["dueDate", "amount", "billingType"]),
};

export const CONTRATOS: Record<string, Ferramenta> = {
  criar_contrato: {
    description: "Cria um contrato como a tela Contratos → Novo: grava, atualiza o cliente, gera os lançamentos do financeiro e cria as cobranças no Asaas (assinatura/parcelas pelo webhook; ou uma cobrança por pagamento + aviso no WhatsApp, se pagamentos_personalizados). Use buscar em clients para achar o cliente_id.",
    inputSchema: parametros({
      cliente_id: { type: "string" },
      tipo: { type: "string", description: "Serviço/plano, ex.: 'Gestão de Tráfego'." },
      valor_mensal: { type: "number", description: "Em reais. Ignorado se pagamentos_personalizados." },
      data_inicio: { type: "string", description: "YYYY-MM-DD" },
      data_fim: { type: "string", description: "YYYY-MM-DD (dispensado se pagamento_unico)." },
      dia_pagamento: { type: "number", description: "1 a 28. Padrão 1." },
      status: { type: "string", enum: ["active", "expiring", "inactive"], description: "Padrão active." },
      link_contrato: { type: "string" },
      pagamento_unico: { type: "boolean", description: "Cobra uma vez, na data de início." },
      categoria: { type: "string", enum: ["recorrente", "pontual", "rescisao"], description: "Recorrente entra no MRR. Padrão recorrente." },
      forma_cobranca: { type: "string", enum: ["BOLETO", "PIX", "CREDIT_CARD"], description: "Padrão BOLETO." },
      pagamentos_personalizados: pagamentoSchema,
    }, ["cliente_id", "tipo"]),
    executar: criarContrato,
  },
  editar_contrato: {
    description: "Edita um contrato como a tela. Se mudar valor, datas ou dia de pagamento, a 1ª chamada NÃO grava: devolve os boletos atuais do Asaas para revisão (precisa_confirmar). Repita com remover_boletos_antigos (payment_ids ok, ou [] para manter). Depois: refaz lançamentos e cria o novo parcelamento no Asaas.",
    inputSchema: parametros({
      contrato_id: { type: "string" }, tipo: { type: "string" }, valor_mensal: { type: "number" },
      data_inicio: { type: "string" }, data_fim: { type: "string" },
      status: { type: "string", enum: ["active", "expiring", "inactive"] },
      dia_pagamento: { type: "number" }, link_contrato: { type: "string" },
      categoria: { type: "string", enum: ["recorrente", "pontual", "rescisao"] },
      remover_boletos_antigos: { type: "array", items: { type: "string" } },
    }, ["contrato_id"]),
    executar: (a) => editarContrato(a),
  },
  renovar_contrato: {
    description: "Renova um contrato como a tela: cria o contrato novo (padrão: começa no dia seguinte ao fim do atual, mesma duração), marca o cliente Ativo, gera lançamentos e envia ao Asaas. O contrato antigo não é inativado.",
    inputSchema: parametros({
      contrato_id: { type: "string" }, tipo: { type: "string" }, valor_mensal: { type: "number" },
      data_inicio: { type: "string" }, data_fim: { type: "string" }, dia_pagamento: { type: "number" },
      link_contrato: { type: "string" }, pagamento_unico: { type: "boolean" },
    }, ["contrato_id"]),
    executar: renovarContrato,
  },
  encerrar_contrato: {
    description: "Cancela um contrato como a tela (botão cancelar): inativa; se o cliente não tem outro contrato ativo, marca-o Inativo e apaga as faturas pendentes; senão refaz as faturas. Com multa_valor + multa_vencimento, lança a multa rescisória e cria a cobrança no Asaas.",
    inputSchema: parametros({
      contrato_id: { type: "string" }, multa_valor: { type: "number" }, multa_vencimento: { type: "string", description: "YYYY-MM-DD" },
    }, ["contrato_id"]),
    executar: encerrarContrato,
  },
  excluir_contrato: {
    description: "Apaga o contrato do sistema (não é cancelar: para cancelar use encerrar_contrato).",
    inputSchema: parametros({ contrato_id: { type: "string" } }, ["contrato_id"]),
    executar: excluirContrato,
  },
};
