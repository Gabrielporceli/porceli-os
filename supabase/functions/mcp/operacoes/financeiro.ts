// Financeiro — lançamentos (src/hooks/useFinancialEntries.ts), renegociação
// (src/components/Financial/RenegotiationModal.tsx) e despesas
// (src/hooks/useExpenses.ts), no mesmo passo a passo da tela.
import { db, dono, exigir, Ferramenta, invocar, parametros } from "../contexto.ts";
import { gerarLancamentosDoCliente } from "../lancamentos.ts";

type Forma = "BOLETO" | "PIX" | "CREDIT_CARD";

// Taxas do Asaas (as do painel da conta, iguais às do modal).
const ASAAS_FEES: Record<Forma, (n: number) => { fixed: number; percent: number }> = {
  BOLETO: (n) => ({ fixed: 1.99 * n, percent: 0 }),
  PIX: () => ({ fixed: 0.99, percent: 0 }),
  CREDIT_CARD: (n) => ({ fixed: 0.49, percent: n === 1 ? 2.99 : n <= 6 ? 3.49 : n <= 12 ? 3.99 : 4.29 }),
};
function bruto(net: number, forma: Forma, n: number): number {
  const { fixed, percent } = ASAAS_FEES[forma](n);
  return percent === 0 ? net + fixed : (net + fixed) / (1 - percent / 100);
}
function somarMeses(iso: string, meses: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

async function marcarLancamentoPago(a: { lancamento_id: string }) {
  const { id: userId } = await dono();
  const { data, error } = await db.from("financial_entries").update({
    status: "paid",
    paid_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  }).eq("id", exigir(a.lancamento_id, "lancamento_id é obrigatório")).eq("user_id", userId).select("id, name, amount, due_date").single();
  if (error) throw new Error(error.message);
  return { passos: ["pagamento registrado"], lancamento: data };
}

async function gerarLancamentosFaltantes() {
  const { id: userId } = await dono();
  const { data: clientes, error } = await db.from("clients").select("id, monthly_value, contract_end, payment_day").eq("user_id", userId);
  if (error) throw new Error(error.message);
  let clientesProcessados = 0;
  let criados = 0;
  for (const c of clientes ?? []) {
    if (c.monthly_value && c.contract_end && c.payment_day) {
      try { criados += await gerarLancamentosDoCliente(c.id, userId); clientesProcessados++; } catch { /* segue os outros */ }
    }
  }
  return { passos: [`${clientesProcessados} cliente(s) processado(s), ${criados} lançamento(s) criado(s)`] };
}

async function renegociar(a: {
  cliente_id: string; lancamento_ids: string[]; modo?: "parcelamento" | "personalizado";
  valor_total?: number; parcelas?: number; vencimento?: string; forma?: Forma; repassar_taxas?: boolean;
  entrada_valor?: number; entrada_vencimento?: string;
  pagamentos?: { dueDate: string; amount: number; billingType: Forma }[];
  avisar_cliente?: boolean; remover_boletos_antigos?: string[];
}) {
  const { id: userId } = await dono();
  exigir(a.cliente_id, "cliente_id é obrigatório");
  if (!a.lancamento_ids?.length) throw new Error("Selecione ao menos uma cobrança (lancamento_ids).");
  const modo = a.modo ?? "parcelamento";
  const forma = a.forma ?? "BOLETO";
  const repassar = a.repassar_taxas ?? true;
  const parcelas = Math.max(1, a.parcelas ?? 1);

  const { data: sel } = await db.from("financial_entries").select("id, amount")
    .in("id", a.lancamento_ids).eq("user_id", userId).eq("client_id", a.cliente_id);
  if (!sel || sel.length !== a.lancamento_ids.length) throw new Error("Algum lancamento_id não existe ou não é deste cliente.");
  const totalSelecionado = sel.reduce((s, e) => s + Number(e.amount), 0);

  // Validações do modal.
  const valorTotal = a.valor_total ?? totalSelecionado;
  if (modo === "personalizado") {
    if (!a.pagamentos?.length) throw new Error("Adicione ao menos um pagamento.");
    if (a.pagamentos.some((p) => !(p.amount > 0) || !p.dueDate)) throw new Error("Preencha valor e data em todos os pagamentos.");
  } else {
    if (!(valorTotal > 0)) throw new Error("Informe um valor válido.");
    if (a.entrada_valor && a.entrada_valor >= valorTotal) throw new Error("O valor da entrada deve ser menor que o total.");
    exigir(a.vencimento, "vencimento (da 1ª parcela) é obrigatório");
    if (a.entrada_valor) exigir(a.entrada_vencimento, "entrada_vencimento é obrigatório quando há entrada");
  }

  // Etapa de revisão: o servidor confere cada boleto antigo no Asaas. Nada muda aqui.
  if (a.remover_boletos_antigos === undefined) {
    const prev = await invocar("asaas-renegotiation", { action: "preview_removal", entry_ids: a.lancamento_ids });
    if (!prev?.success) throw new Error(`Não consegui conferir os boletos antigos no Asaas: ${prev?.error ?? "erro"}`);
    return {
      precisa_confirmar: true,
      explicacao: "Revise os boletos antigos. Repita renegociar com os mesmos campos e remover_boletos_antigos = lista de entry_id (só os ok: true) a remover do Asaas depois que os novos forem criados, ou [] para não remover nenhum.",
      checagens: prev.checagens ?? [],
      total_selecionado: totalSelecionado,
    };
  }

  const passos: string[] = [];
  const avisos: string[] = [];
  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const { data: cli } = await db.from("clients").select("cnpj, company, email, phone").eq("id", a.cliente_id).single();
  const nome = cli?.company ?? "";
  const asaas = cli?.cnpj ? { cnpj: cli.cnpj, company_name: cli.company, email: cli.email, phone: cli.phone } : null;
  if (!asaas) avisos.push("CNPJ não encontrado — cobrança Asaas ignorada. As faturas locais serão atualizadas normalmente.");

  const novos: Record<string, unknown>[] = [];
  let falhouAsaas = false;
  const novaRef = () => `porceli:reneg:${crypto.randomUUID()}`;
  // deno-lint-ignore no-explicit-any
  const criar = async (body: Record<string, unknown>, rotulo: string): Promise<{ id: string }[]> => {
    const r = await invocar("asaas-renegotiation", body).catch((e) => ({ success: false, error: (e as Error).message }));
    if (!r?.success) { falhouAsaas = true; avisos.push(`Asaas ${rotulo}: ${r?.error ?? "falhou"}`); return []; }
    return (r.payments ?? (r.payment ? [r.payment] : [])) as { id: string }[];
  };
  const vinculo = (criadas: { id: string }[], i: number, ref: string) =>
    criadas[i]?.id ? { asaas_payment_id: criadas[i].id, asaas_link_origin: "criacao", asaas_external_ref: ref } : { asaas_payment_id: null };

  if (modo === "personalizado") {
    for (const [i, p] of a.pagamentos!.entries()) {
      const ref = novaRef();
      const criadas = asaas ? await criar({ ...asaas, billing_type: p.billingType, total_amount: p.amount, due_date: p.dueDate, installments: 1, description: `Renegociação Pagamento ${i + 1} — ${nome}`, external_reference: ref }, `pagamento ${i + 1}`) : [];
      novos.push({ client_id: a.cliente_id, user_id: userId, name: nome, amount: p.amount, due_date: p.dueDate, reference: `Renegociação — Pagamento ${i + 1}/${a.pagamentos!.length}`, status: "pending", ...vinculo(criadas, 0, ref) });
    }
  } else {
    const entrada = a.entrada_valor ?? 0;
    const base = Math.max(0, valorTotal - entrada);
    const grossParcelas = repassar && base > 0 ? bruto(base, forma, parcelas) : base;
    const grossEntrada = entrada > 0 && repassar ? bruto(entrada, forma, 1) : entrada;
    const valorParcela = grossParcelas / parcelas;
    const asaasBase = asaas ? { ...asaas, billing_type: forma } : null;

    if (entrada > 0 && grossEntrada > 0) {
      const ref = novaRef();
      const criadas = asaasBase ? await criar({ ...asaasBase, total_amount: grossEntrada, due_date: a.entrada_vencimento, installments: 1, description: `Entrada Renegociação — ${nome}`, external_reference: ref }, "entrada") : [];
      novos.push({ client_id: a.cliente_id, user_id: userId, name: nome, amount: grossEntrada, due_date: a.entrada_vencimento, reference: "Renegociação — Entrada", status: "pending", ...vinculo(criadas, 0, ref) });
    }
    if (grossParcelas > 0) {
      const ref = novaRef();
      const criadas = asaasBase ? await criar({ ...asaasBase, total_amount: grossParcelas, due_date: a.vencimento, installments: parcelas, description: `Renegociação — ${nome}`, external_reference: ref }, "parcelas") : [];
      for (let i = 0; i < parcelas; i++) {
        novos.push({ client_id: a.cliente_id, user_id: userId, name: nome, amount: valorParcela, due_date: i === 0 ? a.vencimento : somarMeses(a.vencimento!, i), reference: parcelas > 1 ? `Renegociação — Parcela ${i + 1}/${parcelas}` : "Renegociação", status: "pending", ...vinculo(criadas, i, ref) });
      }
    }
  }
  if (asaas) passos.push(falhouAsaas ? "cobranças novas: alguma falhou no Asaas" : "cobranças novas criadas no Asaas");

  // Boletos antigos: só remove se TODAS as novas foram criadas (cliente nunca fica sem boleto).
  const aprovados = a.remover_boletos_antigos ?? [];
  if (aprovados.length > 0) {
    if (falhouAsaas) avisos.push("Alguma cobrança nova não foi criada no Asaas — os boletos antigos foram MANTIDOS lá.");
    else {
      const canc = await invocar("asaas-renegotiation", { action: "cancel", entry_ids: aprovados, motivo: `renegociação — ${nome}` }).catch(() => null);
      const removidos = ((canc?.resultados ?? []) as { removido: boolean }[]).filter((x) => x.removido).length;
      if (!canc) avisos.push("Não foi possível remover os boletos antigos no Asaas — remova manualmente.");
      else {
        passos.push(`${removidos} boleto(s) antigo(s) removido(s) no Asaas`);
        if (removidos < aprovados.length) avisos.push(`${aprovados.length - removidos} boleto(s) antigo(s) não foram removidos — confira no Asaas.`);
      }
    }
  }

  const { error: delErr } = await db.from("financial_entries").delete().in("id", a.lancamento_ids).eq("user_id", userId);
  if (delErr) throw new Error("Erro ao remover cobranças antigas: " + delErr.message);
  const { error: insErr } = await db.from("financial_entries").insert(novos);
  if (insErr) throw new Error("Erro ao criar novas cobranças: " + insErr.message);
  passos.push(`${a.lancamento_ids.length} lançamento(s) antigo(s) substituído(s) por ${novos.length} novo(s)`);

  if (a.avisar_cliente ?? true) {
    if (!asaas) avisos.push("CNPJ não encontrado — o aviso por WhatsApp não foi enviado.");
    else {
      const aviso = await invocar("renegotiation-notice", { client_id: a.cliente_id, since: startedAt }).catch((e) => ({ success: false, error: (e as Error).message }));
      if (aviso?.success) passos.push("cliente avisado por WhatsApp");
      else avisos.push(`Não foi possível avisar o cliente por WhatsApp: ${aviso?.error ?? "erro"}`);
    }
  }
  return { passos, avisos };
}

// ── Despesas ──────────────────────────────────────────────────────────────

function proximaData(data: string, tipo: string): string {
  const d = new Date(data);
  if (tipo === "weekly") d.setDate(d.getDate() + 7);
  else if (tipo === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (tipo === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

async function criarDespesa(a: {
  descricao: string; valor: number; categoria: string; data: string; status?: string;
  cliente_id?: string; recorrente?: boolean; recorrencia?: "weekly" | "monthly" | "quarterly" | "yearly";
}) {
  const { id: userId } = await dono();
  if (!a.descricao?.trim()) throw new Error("Descrição obrigatória.");
  if (!(Number(a.valor) > 0)) throw new Error("Valor da despesa deve ser um número maior que zero.");
  if (!a.categoria?.trim()) throw new Error("Categoria obrigatória.");
  let data = a.data;
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const p = data.split(/[/-]/);
    if (p.length === 3 && p[0].length !== 4) data = `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) throw new Error("Data obrigatória no formato YYYY-MM-DD.");
  const { data: row, error } = await db.from("finances").insert({
    description: a.descricao, amount: a.valor, category: a.categoria, date: data,
    status: a.status ?? "pending", type: "expense", user_id: userId, client_id: a.cliente_id ?? null,
    is_recurring: a.recorrente || false, recurrence_type: a.recorrente ? (a.recorrencia ?? "monthly") : null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { despesa_id: row.id, passos: ["despesa criada"] };
}

async function pagarDespesa(a: { despesa_id: string }) {
  const { id: userId } = await dono();
  const { data: d, error } = await db.from("finances").select("*").eq("id", exigir(a.despesa_id, "despesa_id é obrigatório")).eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  const { error: e2 } = await db.from("finances").update({ status: "paid" }).eq("id", d.id).eq("user_id", userId);
  if (e2) throw new Error(e2.message);
  const passos = ["despesa paga"];
  if (d.is_recurring && d.recurrence_type) {
    const { error: e3 } = await db.from("finances").insert({
      description: d.description, amount: d.amount, category: d.category, date: proximaData(d.date, d.recurrence_type),
      status: "pending", type: "expense", user_id: userId, client_id: d.client_id, is_recurring: true, recurrence_type: d.recurrence_type,
    });
    passos.push(e3 ? `próxima recorrência NÃO criada: ${e3.message}` : "próxima recorrência criada");
  }
  return { passos };
}

async function excluirDespesa(a: { despesa_id: string }) {
  const { id: userId } = await dono();
  const { error } = await db.from("finances").delete().eq("id", exigir(a.despesa_id, "despesa_id é obrigatório")).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { passos: ["despesa excluída"] };
}

export const FINANCEIRO: Record<string, Ferramenta> = {
  marcar_lancamento_pago: {
    description: "Dá baixa manual num lançamento (financial_entries) com a data de hoje, como o botão 'marcar como pago'.",
    inputSchema: parametros({ lancamento_id: { type: "string" } }, ["lancamento_id"]),
    executar: marcarLancamentoPago,
  },
  gerar_lancamentos_faltantes: {
    description: "Gera os lançamentos que faltam para todos os clientes com contrato (botão 'gerar lançamentos' do Financeiro).",
    inputSchema: parametros({}),
    executar: gerarLancamentosFaltantes,
  },
  renegociar: {
    description: "Renegocia cobranças em atraso como o modal Renegociar: cria as cobranças novas no Asaas (parcelamento com entrada opcional e repasse de taxas, ou pagamentos personalizados), remove os boletos antigos aprovados, troca os lançamentos e avisa o cliente no WhatsApp. 1ª chamada só revisa os boletos antigos (precisa_confirmar); repita com remover_boletos_antigos.",
    inputSchema: parametros({
      cliente_id: { type: "string" },
      lancamento_ids: { type: "array", items: { type: "string" }, description: "Lançamentos em atraso a renegociar." },
      modo: { type: "string", enum: ["parcelamento", "personalizado"] },
      valor_total: { type: "number", description: "Parcelamento: total líquido. Padrão: soma dos selecionados." },
      parcelas: { type: "number" }, vencimento: { type: "string", description: "1ª parcela, YYYY-MM-DD" },
      forma: { type: "string", enum: ["BOLETO", "PIX", "CREDIT_CARD"] },
      repassar_taxas: { type: "boolean", description: "Padrão true: o cliente paga a taxa do Asaas." },
      entrada_valor: { type: "number" }, entrada_vencimento: { type: "string" },
      pagamentos: { type: "array", items: parametros({ dueDate: { type: "string" }, amount: { type: "number" }, billingType: { type: "string", enum: ["BOLETO", "PIX", "CREDIT_CARD"] } }, ["dueDate", "amount", "billingType"]) },
      avisar_cliente: { type: "boolean", description: "Padrão true." },
      remover_boletos_antigos: { type: "array", items: { type: "string" } },
    }, ["cliente_id", "lancamento_ids"]),
    executar: renegociar,
  },
  criar_despesa: {
    description: "Lança uma despesa (Financeiro → Nova despesa). Recorrente gera a próxima quando paga.",
    inputSchema: parametros({
      descricao: { type: "string" }, valor: { type: "number" }, categoria: { type: "string" },
      data: { type: "string", description: "YYYY-MM-DD" }, status: { type: "string", enum: ["pending", "paid"] },
      cliente_id: { type: "string" }, recorrente: { type: "boolean" },
      recorrencia: { type: "string", enum: ["weekly", "monthly", "quarterly", "yearly"] },
    }, ["descricao", "valor", "categoria", "data"]),
    executar: criarDespesa,
  },
  pagar_despesa: {
    description: "Marca a despesa como paga; se recorrente, cria a do próximo período.",
    inputSchema: parametros({ despesa_id: { type: "string" } }, ["despesa_id"]),
    executar: pagarDespesa,
  },
  excluir_despesa: {
    description: "Exclui uma despesa.",
    inputSchema: parametros({ despesa_id: { type: "string" } }, ["despesa_id"]),
    executar: excluirDespesa,
  },
};
