// CRM / Kanban — mesmo passo a passo de src/hooks/useLeads.ts.
import { db, dono, exigir, Ferramenta, parametros } from "../contexto.ts";

// Iguais a formatToJID/cleanPhone de src/lib/utils.ts (que não roda no Deno
// por importar clsx/tailwind-merge).
const limparTelefone = (t: string) => t.replace(/\D/g, "");
const paraJid = (t: string) => (limparTelefone(t) ? `${limparTelefone(t)}@s.whatsapp.net` : "");

type CamposLead = {
  nome?: string; empresa?: string; telefone?: string; email?: string; etapa_id?: string; tags?: string[];
  valor?: number; observacoes?: string; data_reuniao?: string; reuniao_realizada?: boolean;
};

function paraColunas(a: CamposLead): Record<string, unknown> {
  const u: Record<string, unknown> = {};
  if (a.nome !== undefined) u.name = a.nome;
  if (a.empresa !== undefined) u.company = a.empresa;
  if (a.telefone !== undefined) u.phone = limparTelefone(a.telefone);
  if (a.email !== undefined) u.email = a.email || null;
  if (a.etapa_id !== undefined) u.stage = a.etapa_id;
  if (a.tags !== undefined) u.tags = a.tags;
  if (a.valor !== undefined) u.value = a.valor || null;
  if (a.observacoes !== undefined) u.notes = a.observacoes || null;
  if (a.data_reuniao !== undefined) u.meeting_date = a.data_reuniao || null;
  if (a.reuniao_realizada !== undefined) u.reuniao_realizada = a.reuniao_realizada;
  return u;
}

async function criarLead(a: CamposLead & { nome: string; telefone: string; etapa_id: string }) {
  const { id: userId } = await dono();
  exigir(a.nome?.trim(), "nome é obrigatório");
  exigir(a.etapa_id, "etapa_id é obrigatória (veja as etapas em stages)");
  const jid = paraJid(a.telefone ?? "");
  const linha = {
    name: a.nome, company: a.empresa ?? "", phone: limparTelefone(a.telefone ?? ""), email: a.email || null,
    stage: a.etapa_id, tags: a.tags || [], value: a.valor || null, notes: a.observacoes || null,
    meeting_date: a.data_reuniao || null, reuniao_realizada: a.reuniao_realizada || false,
    updated_at: new Date().toISOString(),
  };
  // Como a tela: o mesmo número (remotejid) não vira lead duplicado — atualiza o existente.
  if (jid) {
    const { data: existente } = await db.from("leads").select("id").eq("user_id", userId).eq("remotejid", jid).maybeSingle();
    if (existente) {
      const { error } = await db.from("leads").update(linha).eq("id", existente.id);
      if (error) throw new Error(error.message);
      return { lead_id: existente.id, passos: ["já existia lead com este número: atualizado em vez de duplicar"] };
    }
  }
  const { data, error } = await db.from("leads").insert({ ...linha, user_id: userId, remotejid: jid || null }).select("id").single();
  if (error) throw new Error(error.message);
  return { lead_id: data.id, passos: ["lead criado"] };
}

async function editarLead(a: CamposLead & { lead_id: string }) {
  const { data, error } = await db.from("leads").update(paraColunas(a)).eq("id", exigir(a.lead_id, "lead_id é obrigatório")).select("id").single();
  if (error) throw new Error(error.message);
  return { lead_id: data.id, passos: ["lead atualizado"] };
}

async function moverLead(a: { lead_id: string; etapa_id: string }) {
  const { error } = await db.from("leads").update({ stage: exigir(a.etapa_id, "etapa_id é obrigatória") })
    .eq("id", exigir(a.lead_id, "lead_id é obrigatório"));
  if (error) throw new Error(error.message);
  return { passos: ["lead movido de etapa"] };
}

async function excluirLead(a: { lead_id: string }) {
  const { error } = await db.from("leads").delete().eq("id", exigir(a.lead_id, "lead_id é obrigatório"));
  if (error) throw new Error(error.message);
  return { passos: ["lead excluído"] };
}

const camposLead = {
  nome: { type: "string" }, empresa: { type: "string" }, telefone: { type: "string", description: "Com DDI/DDD; vira o identificador do WhatsApp." },
  email: { type: "string" }, etapa_id: { type: "string", description: "id da coluna do Kanban (tabela stages)." },
  tags: { type: "array", items: { type: "string" } }, valor: { type: "number", description: "Em reais (número)." },
  observacoes: { type: "string" }, data_reuniao: { type: "string", description: "ISO 8601" }, reuniao_realizada: { type: "boolean" },
};

export const CRM: Record<string, Ferramenta> = {
  criar_lead: {
    description: "Cria um lead no Kanban como a tela. Se já existe lead com o mesmo telefone, atualiza o existente (não duplica).",
    inputSchema: parametros(camposLead, ["nome", "telefone", "etapa_id"]),
    executar: criarLead,
  },
  editar_lead: {
    description: "Edita os campos de um lead.",
    inputSchema: parametros({ lead_id: { type: "string" }, ...camposLead }, ["lead_id"]),
    executar: editarLead,
  },
  mover_lead: {
    description: "Move o lead para outra coluna do Kanban (arrastar card).",
    inputSchema: parametros({ lead_id: { type: "string" }, etapa_id: { type: "string" } }, ["lead_id", "etapa_id"]),
    executar: moverLead,
  },
  excluir_lead: {
    description: "Exclui um lead.",
    inputSchema: parametros({ lead_id: { type: "string" } }, ["lead_id"]),
    executar: excluirLead,
  },
};
