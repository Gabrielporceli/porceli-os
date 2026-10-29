// Clientes — mesmo passo a passo de src/hooks/useClients.ts e
// src/pages/Clients.tsx. O endereço vira coordenada (mapa) com a MESMA função
// da tela; mudar valor/vigência/dia de pagamento refaz os lançamentos.
import { geocodeAddress } from "../../../../src/lib/geocode.ts";
import { db, dono, exigir, Ferramenta, parametros } from "../contexto.ts";
import { atualizarLancamentosDoCliente } from "../lancamentos.ts";

/**
 * Coordenadas do endereço. Primeiro a MESMA função da tela (Nominatim); ela
 * funciona do navegador, mas o Nominatim recusa pedidos vindos de servidor
 * (IP de data center). Sem resultado, tenta o Photon — mesma base do
 * OpenStreetMap, aceita servidor.
 */
async function localizar(endereco: string): Promise<{ lat: number; lng: number } | null> {
  const r = await geocodeAddress(endereco);
  if (r) return r;
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(endereco)}&limit=1`, {
      headers: { "User-Agent": "PorceliOS/1.0" }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const [lng, lat] = (await res.json())?.features?.[0]?.geometry?.coordinates ?? [];
    return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
  } catch {
    return null;
  }
}

async function criarCliente(a: {
  empresa: string; responsavel: string; cnpj?: string; telefone?: string; email?: string;
  endereco?: string; grupo_whatsapp?: string;
}) {
  const { id: userId } = await dono();
  exigir(a.empresa?.trim(), "empresa é obrigatória");
  exigir(a.responsavel?.trim(), "responsavel é obrigatório");
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (a.endereco) {
    const c = await localizar(a.endereco);
    if (c) { latitude = c.lat; longitude = c.lng; }
  }
  // Como o NewClientModal: cliente nasce SEM dados de contrato (plano, valor,
  // datas vêm do contrato) e com a tag Ativo. Sem contract_end e valor, o
  // gatilho create_contract_for_client não cria contrato; nada vai ao Asaas.
  const { data, error } = await db.from("clients").insert({
    user_id: userId, company: a.empresa, cnpj: a.cnpj ?? "", responsible: a.responsavel,
    phone: a.telefone ?? "", email: a.email ?? "", group_id: a.grupo_whatsapp || null,
    plan: null, contract_end: null, start_date: null, payment_day: 1, monthly_value: 0,
    address: a.endereco || null, tags: ["Ativo"], latitude, longitude,
  }).select("id, company").single();
  if (error) throw new Error(error.message);
  return {
    cliente_id: data.id,
    passos: ["cliente criado", latitude !== null ? "endereço localizado no mapa" : "sem coordenadas (endereço vazio ou não encontrado)"],
    proximo_passo: "Para cobrar, crie o contrato (criar_contrato) — é ele que gera lançamentos e Asaas.",
  };
}

async function editarCliente(a: {
  cliente_id: string; empresa?: string; responsavel?: string; cnpj?: string; telefone?: string; email?: string;
  endereco?: string | null; grupo_whatsapp?: string | null; plano?: string | null; tags?: string[];
  valor_mensal?: number; data_inicio?: string | null; fim_contrato?: string | null; dia_pagamento?: number;
}) {
  const { id: userId } = await dono();
  exigir(a.cliente_id, "cliente_id é obrigatório");
  const u: Record<string, unknown> = {};
  if (a.empresa !== undefined) u.company = a.empresa;
  if (a.responsavel !== undefined) u.responsible = a.responsavel;
  if (a.cnpj !== undefined) u.cnpj = a.cnpj;
  if (a.telefone !== undefined) u.phone = a.telefone;
  if (a.email !== undefined) u.email = a.email;
  if (a.grupo_whatsapp !== undefined) u.group_id = a.grupo_whatsapp || null;
  if (a.plano !== undefined) u.plan = a.plano || null;
  if (a.tags !== undefined) u.tags = a.tags;
  if (a.valor_mensal !== undefined) u.monthly_value = a.valor_mensal || 0;
  if (a.data_inicio !== undefined) u.start_date = a.data_inicio || null;
  if (a.fim_contrato !== undefined) u.contract_end = a.fim_contrato || null;
  if (a.dia_pagamento !== undefined) u.payment_day = a.dia_pagamento;
  const passos: string[] = [];

  if (a.endereco !== undefined) {
    u.address = a.endereco || null;
    const c = a.endereco ? await localizar(a.endereco) : null;
    u.latitude = c ? c.lat : null;
    u.longitude = c ? c.lng : null;
    passos.push(c ? "endereço relocalizado no mapa" : "coordenadas limpas");
  }

  const { error } = await db.from("clients").update(u).eq("id", a.cliente_id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  passos.unshift("cliente atualizado");

  const avisos: string[] = [];
  if (a.valor_mensal !== undefined || a.fim_contrato !== undefined || a.dia_pagamento !== undefined) {
    try {
      const n = await atualizarLancamentosDoCliente(a.cliente_id, userId);
      passos.push(`lançamentos refeitos (${n} novo(s))`);
    } catch (e) {
      avisos.push(`lançamentos: ${(e as Error).message}`);
    }
  }
  return { cliente_id: a.cliente_id, passos, avisos };
}

async function excluirCliente(a: { cliente_id: string }) {
  const { id: userId } = await dono();
  const { error } = await db.from("clients").delete().eq("id", exigir(a.cliente_id, "cliente_id é obrigatório")).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { passos: ["cliente excluído"] };
}

export const CLIENTES: Record<string, Ferramenta> = {
  criar_cliente: {
    description: "Cadastra um cliente como a tela Clientes → Novo: tag Ativo, endereço localizado no mapa. Não cria contrato nem cobrança — para isso use criar_contrato depois.",
    inputSchema: parametros({
      empresa: { type: "string" }, responsavel: { type: "string" }, cnpj: { type: "string", description: "Necessário para cobrar no Asaas." },
      telefone: { type: "string" }, email: { type: "string" }, endereco: { type: "string" },
      grupo_whatsapp: { type: "string", description: "JID do grupo (…@g.us), se houver." },
    }, ["empresa", "responsavel"]),
    executar: criarCliente,
  },
  editar_cliente: {
    description: "Edita um cliente como a tela. Mudar endereço refaz as coordenadas; mudar valor_mensal, fim_contrato ou dia_pagamento refaz os lançamentos pendentes futuros.",
    inputSchema: parametros({
      cliente_id: { type: "string" }, empresa: { type: "string" }, responsavel: { type: "string" },
      cnpj: { type: "string" }, telefone: { type: "string" }, email: { type: "string" }, endereco: { type: "string" },
      grupo_whatsapp: { type: "string" }, plano: { type: "string" }, tags: { type: "array", items: { type: "string" } },
      valor_mensal: { type: "number" }, data_inicio: { type: "string" }, fim_contrato: { type: "string" },
      dia_pagamento: { type: "number" },
    }, ["cliente_id"]),
    executar: editarCliente,
  },
  excluir_cliente: {
    description: "Exclui o cliente (como o botão excluir da tela).",
    inputSchema: parametros({ cliente_id: { type: "string" } }, ["cliente_id"]),
    executar: excluirCliente,
  },
};
