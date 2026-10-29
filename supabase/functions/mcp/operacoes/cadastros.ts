// Mensagens agendadas, WhatsApp, automações e os cadastros sem efeito em
// cascata (etapas, tags, planos, ideias, funis) — onde a tela também só grava
// a linha. Cada um com a regra que a tela aplica.
import { db, dono, exigir, Ferramenta, invocar, parametros } from "../contexto.ts";

// ── Mensagens agendadas (src/hooks/useScheduledMessages.ts) ──────────────

async function agendarMensagem(a: { telefone: string; mensagem: string; quando: string; destinatario?: "responsible" | "group" | "custom"; cliente_id?: string; cliente_nome?: string }) {
  const { id: userId } = await dono();
  const { data, error } = await db.from("scheduled_messages").insert({
    user_id: userId, phone: exigir(a.telefone, "telefone é obrigatório"), message: exigir(a.mensagem, "mensagem é obrigatória"),
    scheduled_at: exigir(a.quando, "quando (ISO 8601) é obrigatório"), recipient_type: a.destinatario ?? "custom",
    client_id: a.cliente_id ?? null, client_name: a.cliente_nome ?? null, status: "pending",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { mensagem_id: data.id, passos: ["mensagem agendada (o disparo roda a cada minuto)"] };
}

async function cancelarMensagem(a: { mensagem_id: string }) {
  // O gatilho scheduled_messages_cancel_outbox tira da fila de envio.
  const { error } = await db.from("scheduled_messages").update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", exigir(a.mensagem_id, "mensagem_id é obrigatório"));
  if (error) throw new Error(error.message);
  return { passos: ["mensagem cancelada"] };
}

// ── WhatsApp imediato: a fila única que o sistema inteiro usa ────────────

async function enviarWhatsapp(a: { numero: string; mensagem: string }) {
  const numero = String(exigir(a.numero, "numero é obrigatório"));
  const { data, error } = await db.from("whatsapp_outbox").insert({
    number: numero.includes("@") ? numero : numero.replace(/\D/g, ""), text: exigir(a.mensagem, "mensagem é obrigatória"),
    source: "hermes", dedupe_key: `hermes:${crypto.randomUUID()}`,
  }).select("id").single();
  if (error) throw new Error(error.message);
  invocar("whatsapp-outbox", undefined, { comoServico: true }).catch(() => {}); // não espera o cron
  return { passos: ["mensagem na fila; o worker envia em seguida"], id: data.id };
}

// ── Automações (src/hooks/useAutomations.ts → manage-automations) ────────

async function automacoes(a: { acao: "listar" | "ligar" | "desligar" | "reagendar" | "disparar"; id?: string; jobname?: string; function_name?: string; schedule?: string }) {
  if (a.acao === "listar") {
    // O GET da manage-automations quebra (.catch num query builder); a tela lê a tabela.
    const { data, error } = await db.from("automations").select("*").order("category").order("display_name");
    if (error) throw new Error(error.message);
    return data;
  }
  const { acao, ...d } = a;
  const action = acao === "ligar" || acao === "desligar" ? "toggle" : acao === "reagendar" ? "update_schedule" : "trigger";
  return await invocar("manage-automations", { ...d, action, ...(action === "toggle" ? { enabled: acao === "ligar" } : {}) }, { comoServico: true });
}

// ── Cadastros simples ─────────────────────────────────────────────────────

const SIMPLES: Record<string, string> = {
  stages: "colunas do Kanban (name, color, position)",
  tags: "etiquetas (name, color)",
  plans: "planos/serviços (name, color, is_default)",
  content_ideas: "ideias de conteúdo (gancho, categoria, formato, referencia, observacao, roteiro, feito, ordem)",
  funnel_maps: "mapas de funil",
};

async function cadastro(a: { acao: "criar" | "editar" | "excluir"; tabela: string; id?: string; dados?: Record<string, unknown> }) {
  const { id: userId } = await dono();
  if (!SIMPLES[a.tabela]) throw new Error(`cadastro só aceita: ${Object.keys(SIMPLES).join(", ")}. Para o resto use a operação própria.`);
  if (a.acao === "criar") {
    const linha: Record<string, unknown> = { ...(a.dados ?? {}), user_id: userId };
    // Etapa nova entra no fim do Kanban, como na tela.
    if (a.tabela === "stages" && linha.position === undefined) {
      const { data: ult } = await db.from("stages").select("position").eq("user_id", userId).order("position", { ascending: false }).limit(1);
      linha.position = (ult?.[0]?.position ?? 0) + 1;
    }
    const { data, error } = await db.from(a.tabela).insert(linha).select().single();
    if (error) throw new Error(error.message);
    return { passos: ["criado"], registro: data };
  }
  exigir(a.id, "id é obrigatório para editar/excluir");
  if (a.acao === "editar") {
    const { data, error } = await db.from(a.tabela).update(a.dados ?? {}).eq("id", a.id).eq("user_id", userId).select().single();
    if (error) throw new Error(error.message);
    return { passos: ["atualizado"], registro: data };
  }
  const { error } = await db.from(a.tabela).delete().eq("id", a.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { passos: ["excluído"] };
}

export const CADASTROS: Record<string, Ferramenta> = {
  enviar_whatsapp: {
    description: "Envia WhatsApp agora pelo número do sistema (fila whatsapp_outbox, com retentativa). Número com DDI (5565999999999) ou grupo (…@g.us).",
    inputSchema: parametros({ numero: { type: "string" }, mensagem: { type: "string" } }, ["numero", "mensagem"]),
    executar: enviarWhatsapp,
  },
  agendar_mensagem: {
    description: "Agenda uma mensagem de WhatsApp (tela Mensagens Agendadas).",
    inputSchema: parametros({
      telefone: { type: "string" }, mensagem: { type: "string" }, quando: { type: "string", description: "ISO 8601 com fuso, ex.: 2026-11-03T09:00:00-03:00" },
      destinatario: { type: "string", enum: ["responsible", "group", "custom"], description: "responsible = responsável do cliente; group = grupo do cliente; custom = número avulso (padrão)." },
      cliente_id: { type: "string" }, cliente_nome: { type: "string" },
    }, ["telefone", "mensagem", "quando"]),
    executar: agendarMensagem,
  },
  cancelar_mensagem: {
    description: "Cancela uma mensagem agendada (sai da fila de envio).",
    inputSchema: parametros({ mensagem_id: { type: "string" } }, ["mensagem_id"]),
    executar: cancelarMensagem,
  },
  automacoes: {
    description: "Automações (crons) do sistema. acao: listar | ligar | desligar | reagendar | disparar. Para as ações: id/jobname/function_name e schedule (cron) quando reagendar.",
    inputSchema: parametros({
      acao: { type: "string", enum: ["listar", "ligar", "desligar", "reagendar", "disparar"] },
      id: { type: "string" }, jobname: { type: "string" }, function_name: { type: "string" }, schedule: { type: "string" },
    }, ["acao"]),
    executar: automacoes,
  },
  cadastro: {
    description: `Cadastros sem efeito em cascata (a tela também só grava a linha): ${Object.entries(SIMPLES).map(([t, d]) => `${t} = ${d}`).join("; ")}. acao: criar | editar | excluir.`,
    inputSchema: parametros({
      acao: { type: "string", enum: ["criar", "editar", "excluir"] }, tabela: { type: "string", enum: Object.keys(SIMPLES) },
      id: { type: "string" }, dados: { type: "object" },
    }, ["acao", "tabela"]),
    executar: cadastro,
  },
};
