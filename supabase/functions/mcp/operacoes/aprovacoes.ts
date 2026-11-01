// Aprovações dos agentes: o agente pede, o Gabriel decide na Central de Agentes
// (ou no Telegram) e o script da VPS executa a decisão pelo Kanban.
import { db, dono, Ferramenta, parametros } from "../contexto.ts";

const exigir = (v: unknown, msg: string) => {
  if (v === undefined || v === null || String(v).trim() === "") throw new Error(msg);
};

const CAMPOS = "id, agente, titulo, resumo, cliente, acao, status, comentario, decidido_em, processado_em, kanban_task, relatado_em, created_at";

export const APROVACOES: Record<string, Ferramenta> = {
  pedir_aprovacao: {
    description: "Registra um pedido de aprovação do Gabriel (aparece no botão Aprovações da Central de Agentes). "
      + "Use antes de qualquer ação que dependa do ok dele. `ao_aprovar` diz o que fazer se ele aprovar: "
      + "agente (profile do Hermes), modelo opcional, skill opcional e as instruções completas, porque quem "
      + "executa começa do zero. Depois de pedir, encerre a tarefa avisando que está aguardando aprovação.",
    inputSchema: parametros({
      agente: { type: "string", description: "Quem está pedindo (seu profile, ex.: especialista-os)." },
      titulo: { type: "string", description: "A decisão em uma linha, ex.: 'Enviar contrato da Clínica X para assinatura'." },
      resumo: { type: "string", description: "O que o Gabriel precisa saber para decidir (valores, prazos, o que muda), em até 8 linhas." },
      cliente: { type: "string" },
      ao_aprovar: {
        type: "object",
        description: "{ assignee, model?, skill?, instrucoes }",
        properties: {
          assignee: { type: "string" }, model: { type: "string" }, skill: { type: "string" },
          instrucoes: { type: "string" },
        },
        required: ["assignee", "instrucoes"],
      },
    }, ["agente", "titulo", "resumo", "ao_aprovar"]),
    executar: async (a) => {
      exigir(a.titulo, "titulo é obrigatório");
      const acao = (a.ao_aprovar ?? {}) as Record<string, unknown>;
      exigir(acao.assignee, "ao_aprovar.assignee é obrigatório");
      exigir(acao.instrucoes, "ao_aprovar.instrucoes é obrigatório");
      const { id: user_id } = await dono();
      const { data, error } = await db.from("agente_aprovacoes").insert({
        user_id, agente: String(a.agente), titulo: String(a.titulo), resumo: a.resumo ? String(a.resumo) : null,
        cliente: a.cliente ? String(a.cliente) : null, acao,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return { id: data.id, aviso: "Pedido registrado nas Aprovações da Central de Agentes. O Gabriel também pode responder no Telegram." };
    },
  },

  aprovacoes: {
    description: "Lista aprovações. situacao: 'pendentes' (aguardando o Gabriel), 'para_processar' (decididas e ainda "
      + "não executadas) ou 'para_relatar' (executadas, aguardando o resultado).",
    inputSchema: parametros({ situacao: { type: "string", enum: ["pendentes", "para_processar", "para_relatar"] } }, ["situacao"]),
    executar: async ({ situacao }) => {
      const { id: user_id } = await dono();
      let q = db.from("agente_aprovacoes").select(CAMPOS).eq("user_id", user_id).order("created_at").limit(50);
      if (situacao === "pendentes") q = q.eq("status", "pendente");
      else if (situacao === "para_processar") q = q.in("status", ["aprovado", "ajuste", "recusado"]).is("processado_em", null);
      else q = q.not("kanban_task", "is", null).is("relatado_em", null);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { aprovacoes: data ?? [] };
    },
  },

  atualizar_aprovacao: {
    description: "Atualiza uma aprovação. Agente: use status 'resolvido_fora' quando o Gabriel decidiu pelo Telegram, "
      + "ou 'cancelado' se o pedido perdeu o sentido. O script da VPS usa processado, kanban_task, relatado e resultado.",
    inputSchema: parametros({
      id: { type: "string" },
      status: { type: "string", enum: ["resolvido_fora", "cancelado"] },
      comentario: { type: "string" },
      processado: { type: "boolean" },
      kanban_task: { type: "string" },
      relatado: { type: "boolean" },
      resultado: { type: "string" },
    }, ["id"]),
    executar: async (a) => {
      exigir(a.id, "id é obrigatório");
      const { id: user_id } = await dono();
      const agora = new Date().toISOString();
      const mud: Record<string, unknown> = {};
      if (a.status) Object.assign(mud, { status: a.status, decidido_em: agora });
      if (a.comentario) mud.comentario = String(a.comentario);
      if (a.processado) mud.processado_em = agora;
      if (a.kanban_task) mud.kanban_task = String(a.kanban_task);
      if (a.relatado) mud.relatado_em = agora;
      if (a.resultado) mud.resultado = String(a.resultado).slice(0, 4000);
      if (!Object.keys(mud).length) throw new Error("nada para atualizar");
      const { error } = await db.from("agente_aprovacoes").update(mud).eq("id", String(a.id)).eq("user_id", user_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  },
};
