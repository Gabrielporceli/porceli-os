// Ficha do cliente — SÓ LEITURA. É o contexto de negócio que os agentes usam
// para tratar cada cliente no nicho dele (ticket, margem, conversão, oferta,
// público, restrições, tom). Quem preenche é a agência ou o dono do negócio;
// agente nunca grava as respostas: propõe a mudança e o Gabriel aprova. A única
// escrita é o carimbo de que a tarefa de metas foi criada (script da VPS).
import { CAMPOS_FICHA, completude, campoVisivel, rotuloDoModelo } from "../../../../src/features/clients/fichaCampos.ts";
import { db, Ferramenta, parametros } from "../contexto.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function acharCliente(ref: string): Promise<{ id: string; company: string }> {
  const r = ref.trim();
  if (!r) throw new Error("informe o cliente (nome ou id)");
  const q = UUID.test(r)
    ? db.from("clients").select("id, company").eq("id", r)
    : db.from("clients").select("id, company").ilike("company", `%${r.replace(/[%_]/g, "")}%`);
  const { data, error } = await q.limit(5);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`cliente não encontrado: ${r}`);
  if (data.length > 1) {
    const exato = data.find((c) => c.company.toLowerCase() === r.toLowerCase());
    if (exato) return exato;
    throw new Error(`mais de um cliente com "${r}": ${data.map((c) => c.company).join(", ")}. Use o nome completo ou o id.`);
  }
  return data[0];
}

export const FICHA: Record<string, Ferramenta> = {
  ficha_do_cliente: {
    description: "Ficha de negócio de um cliente (só leitura): nicho, onde vende, ticket mediano, margem bruta (antes do marketing), lucro atual, "
      + "conversão lead → venda, CPL máximo calculado, recompra e LTV calculado (ticket × compras por cliente), meta, oferta, diferenciais, público, atendimento, restrições (inclusive regras de conselho) "
      + "e tom de voz. Use antes de planejar, analisar ou escrever para o cliente. Campo vazio = não informado: pergunte, não suponha.",
    inputSchema: parametros({ cliente: { type: "string", description: "Nome da empresa ou id do cliente." } }, ["cliente"]),
    executar: async ({ cliente }) => {
      const c = await acharCliente(String(cliente ?? ""));
      const { data: f, error } = await db.from("client_fichas").select("*").eq("client_id", c.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!f) {
        return {
          cliente: c.company, ficha: null,
          aviso: "Sem ficha. Peça ao Gabriel para preencher no cadastro do cliente (ou usar \"Copiar perguntas\" e mandar ao dono do negócio).",
        };
      }
      const respostas: Record<string, unknown> = {};
      const faltando: string[] = [];
      const modelo = (f as Record<string, unknown>).modelo_negocio;
      for (const campo of CAMPOS_FICHA) {
        if (!campoVisivel(campo, modelo)) continue;
        const bruto = (f as Record<string, unknown>)[campo.chave];
        const v = campo.chave === "modelo_negocio" ? rotuloDoModelo(bruto) : bruto;
        if (v === null || v === undefined || String(v).trim() === "") faltando.push(campo.rotulo);
        else respostas[campo.rotulo] = v;
      }
      const { respondidos, total } = completude(f as Record<string, unknown>);
      const { data: contrato } = await db.from("clients").select("monthly_value").eq("id", c.id).maybeSingle();
      return {
        cliente: c.company,
        cliente_id: c.id,
        valor_mensal_contrato: contrato?.monthly_value != null ? Number(contrato.monthly_value) : null,
        ficha: respostas,
        cpl_maximo: f.cpl_maximo ?? null,
        ltv: f.ltv ?? null,
        respondidos: `${respondidos} de ${total}`,
        nao_informado: faltando,
        preenchida_por: f.preenchido_por ?? null,
        respondida_pelo_cliente_em: f.respondido_cliente_em ?? null,
        atualizada_em: f.updated_at,
      };
    },
  },
  fichas_com_metas_pendentes: {
    description: "Fichas cujos números ou nicho mudaram e ainda não viraram tarefa de metas no Tracking "
      + "(o banco marca ao salvar). Usado pelo script das aprovações para avisar o especialista-tracking.",
    inputSchema: parametros({}, []),
    executar: async () => {
      const { data, error } = await db.from("client_fichas")
        .select("client_id, nicho, modelo_negocio, metas_pendentes_desde, metas_tarefa_em, clients(company)")
        .not("metas_pendentes_desde", "is", null);
      if (error) throw new Error(error.message);
      const pendentes = (data ?? []).filter((f) =>
        !f.metas_tarefa_em || new Date(f.metas_pendentes_desde as string) > new Date(f.metas_tarefa_em as string));
      return {
        fichas: pendentes.map((f) => ({
          cliente_id: f.client_id,
          cliente: (f.clients as unknown as { company?: string } | null)?.company ?? null,
          nicho: f.nicho, modelo: rotuloDoModelo(f.modelo_negocio), mudou_em: f.metas_pendentes_desde,
        })),
      };
    },
  },
  marcar_tarefa_de_metas: {
    description: "Carimba que a tarefa de metas daquela ficha foi criada no Kanban (o script chama logo depois de criar).",
    inputSchema: parametros({ cliente_id: { type: "string" } }, ["cliente_id"]),
    executar: async ({ cliente_id }) => {
      const id = String(cliente_id ?? "");
      if (!UUID.test(id)) throw new Error("cliente_id inválido");
      const { error } = await db.from("client_fichas").update({ metas_tarefa_em: new Date().toISOString() }).eq("client_id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  },
};
