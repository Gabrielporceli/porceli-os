// ─────────────────────────────────────────────────────────────────────────
// MCP do Porceli System — o Hermes opera o sistema por aqui.
//
// Regra: o Hermes NÃO grava direto no banco. Cada ferramenta de escrita é uma
// OPERAÇÃO do sistema e repete o passo a passo que a tela executa (criar
// contrato = gravar + sincronizar cliente + gerar lançamentos + Asaas…), em
// operacoes/*.ts. Para ler e analisar: buscar e SQL somente leitura.
//
// Protocolo: MCP sobre Streamable HTTP, sem estado (POST JSON-RPC, resposta
// JSON). Escrito à mão: o Hermes usa initialize, tools/list, tools/call, ping.
//
// Autenticação: `Authorization: Bearer <chave>`. As chaves são geradas e
// revogadas na tela (Central de Agentes → MCP → Conexão) e ficam em
// `mcp_chaves` só como hash. Toda chamada vai para `mcp_audit`.
// ─────────────────────────────────────────────────────────────────────────
import { db, Ferramenta, parametros } from "./contexto.ts";
import { CONTRATOS } from "./operacoes/contratos.ts";
import { CLIENTES } from "./operacoes/clientes.ts";
import { FINANCEIRO } from "./operacoes/financeiro.ts";
import { CRM } from "./operacoes/crm.ts";
import { AGENDA } from "./operacoes/agenda.ts";
import { NOTAS } from "./operacoes/notas.ts";
import { CADASTROS } from "./operacoes/cadastros.ts";
import { FICHA } from "./operacoes/ficha.ts";

const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];
/** Resposta grande demais estoura o contexto do agente: corta e avisa. */
const MAX_TEXTO = 60_000;

function texto(dado: unknown): string {
  const s = typeof dado === "string" ? dado : JSON.stringify(dado, null, 2);
  return s.length > MAX_TEXTO
    ? s.slice(0, MAX_TEXTO) + `\n\n[cortado: ${s.length} caracteres no total — refine a consulta ou use limite]`
    : s;
}

async function sqlLeitura(query: string): Promise<unknown> {
  const { data, error } = await db.rpc("mcp_sql", { p_query: query });
  if (error) throw new Error(error.message);
  return data;
}

const colunasCache = new Map<string, unknown[]>();
async function colunas(tabela: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(tabela)) throw new Error(`nome de tabela inválido: ${tabela}`);
  if (colunasCache.has(tabela)) return colunasCache.get(tabela)!;
  const r = await sqlLeitura(
    `select column_name as coluna, data_type as tipo, is_nullable as nula, column_default as padrao
       from information_schema.columns where table_schema='public' and table_name='${tabela}'
      order by ordinal_position`,
  ) as { linhas: unknown[] };
  if (!r.linhas.length) throw new Error(`tabela não existe: ${tabela}`);
  colunasCache.set(tabela, r.linhas);
  return r.linhas;
}

type Filtro = { coluna: string; op?: string; valor?: unknown };

const GUIA = `# Porceli System — guia para o Hermes

Sistema de gestão da agência Porceli. Você opera o sistema como o dono opera
pela tela: cada ação é uma OPERAÇÃO que executa o passo a passo completo
(gravar, sincronizar, gerar lançamentos, cobrar no Asaas, avisar no WhatsApp).
Você NÃO grava direto em tabelas. Para ler, use buscar ou sql (só leitura).

## Operações
- Clientes: criar_cliente, editar_cliente, excluir_cliente. Cliente novo não cobra nada:
  quem gera lançamentos e Asaas é o contrato.
- Contratos: criar_contrato, editar_contrato, renovar_contrato, encerrar_contrato (cancelar,
  com multa opcional), excluir_contrato.
- Financeiro: marcar_lancamento_pago, gerar_lancamentos_faltantes, renegociar,
  criar_despesa, pagar_despesa, excluir_despesa.
- CRM/Kanban: criar_lead (não duplica pelo telefone), editar_lead, mover_lead, excluir_lead.
- Agenda: listar_agenda, criar_atividade (Notion; com reuniao_meet vira evento do Google
  com Meet), editar_atividade, concluir_tarefa (recorrente gera a próxima), excluir_atividade.
- Notas: criar_nota, editar_nota, excluir_nota (espelham no cofre do GitHub).
- WhatsApp: enviar_whatsapp (agora), agendar_mensagem, cancelar_mensagem.
- Automações: automacoes. Cadastros simples (etapas, tags, planos, ideias, funis): cadastro.

## Operações em duas etapas (dinheiro)
editar_contrato (quando muda valor/datas/dia) e renegociar: a 1ª chamada NÃO altera nada e
devolve precisa_confirmar com os boletos atuais do Asaas. Revise e repita a MESMA chamada com
remover_boletos_antigos (os ids ok: true que devem sair depois que os novos forem criados, ou []).

## Leitura
- buscar: linhas de qualquer tabela com filtros. sql: SELECT livre (somente leitura, 15 s).
- Tabelas: clients, contracts, financial_entries (lançamentos dos contratos), finances
  (despesas), leads + stages (Kanban), notes, scheduled_messages, whatsapp_outbox,
  automations, notion_tasks / google_calendar_events (espelhos), mcp_audit (suas ações).
- cron_runs é GRANDE: sempre filtre por data e use limite. A instância é pequena.

## Regras
- Valores em reais como número (1500.5), nunca "R$ 1.500,50". Datas ISO; fuso America/Sao_Paulo.
- Toda operação devolve passos (o que foi feito) e avisos (o que falhou sem parar o fluxo,
  como a tela mostraria em amarelo). Leia os avisos e informe o dono.
- Antes de agir sobre um cliente/contrato, ache o id com buscar.
`;

const LEITURA: Record<string, Ferramenta> = {
  guia_do_sistema: {
    description: "Como operar o Porceli System: operações, fluxos em duas etapas, tabelas e regras. Leia antes de agir pela primeira vez.",
    inputSchema: parametros({}),
    executar: async () => GUIA,
  },
  listar_tabelas: {
    description: "Tabelas do sistema com quantidade aproximada de linhas.",
    inputSchema: parametros({}),
    executar: () => sqlLeitura(
      `select c.relname as tabela, c.reltuples::bigint as linhas_aprox
         from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' order by 1`,
    ),
  },
  descrever_tabela: {
    description: "Colunas de uma tabela: nome, tipo, se aceita nulo e valor padrão.",
    inputSchema: parametros({ tabela: { type: "string" } }, ["tabela"]),
    executar: ({ tabela }) => colunas(tabela),
  },
  buscar: {
    description: "Lê linhas de uma tabela com filtros, ordem e limite (padrão 50, máx. 1000). Somente leitura.",
    inputSchema: parametros({
      tabela: { type: "string" },
      colunas: { type: "string", description: "Separadas por vírgula; aceita relações, ex.: '*, client:clients(company)'. Padrão *." },
      filtros: {
        type: "array",
        description: "Condições (E). op: eq, neq, gt, gte, lt, lte, like, ilike, is, in.",
        items: parametros({ coluna: { type: "string" }, op: { type: "string" }, valor: {} }, ["coluna"]),
      },
      ordenar: { type: "string", description: "coluna ou coluna.desc" },
      limite: { type: "number" },
    }, ["tabela"]),
    executar: async ({ tabela, colunas: cols, filtros, ordenar, limite }) => {
      await colunas(tabela);
      // deno-lint-ignore no-explicit-any
      let q: any = db.from(tabela).select(cols || "*");
      for (const f of (filtros ?? []) as Filtro[]) {
        const op = (f.op ?? "eq").toLowerCase();
        if (op === "in") q = q.in(f.coluna, Array.isArray(f.valor) ? f.valor : [f.valor]);
        else if (op === "is") q = q.is(f.coluna, f.valor as null | boolean);
        else q = q.filter(f.coluna, op, f.valor);
      }
      if (ordenar) {
        const [c, dir] = String(ordenar).split(".");
        q = q.order(c, { ascending: dir !== "desc" });
      }
      const { data, error } = await q.limit(Math.min(Number(limite) || 50, 1000));
      if (error) throw new Error(error.message);
      return data;
    },
  },
  sql: {
    description: "SQL somente leitura (SELECT/WITH) para análises. Timeout 15 s. Para alterar dados, use as operações.",
    inputSchema: parametros({ query: { type: "string" } }, ["query"]),
    executar: ({ query }) => sqlLeitura(query),
  },
};

const FERRAMENTAS: Record<string, Ferramenta> = {
  ...LEITURA, ...FICHA, ...CLIENTES, ...CONTRATOS, ...FINANCEIRO, ...CRM, ...AGENDA, ...NOTAS, ...CADASTROS,
};

// ── JSON-RPC ──────────────────────────────────────────────────────────────

type Pedido = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const resposta = (id: Pedido["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const falha = (id: Pedido["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function atender(p: Pedido, chaveId: string) {
  switch (p.method) {
    case "initialize": {
      const pedida = String(p.params?.protocolVersion ?? "");
      return resposta(p.id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "porceli-system", version: "2.0.0" },
        instructions: "Opere o Porceli System pelas operações (não há escrita direta). Comece por guia_do_sistema.",
      });
    }
    case "ping":
      return resposta(p.id, {});
    case "tools/list":
      return resposta(p.id, {
        tools: Object.entries(FERRAMENTAS).map(([name, f]) => ({ name, description: f.description, inputSchema: f.inputSchema })),
      });
    case "tools/call": {
      const nome = String(p.params?.name ?? "");
      const args = (p.params?.arguments ?? {}) as Record<string, unknown>;
      const f = FERRAMENTAS[nome];
      if (!f) return falha(p.id, -32602, `ferramenta desconhecida: ${nome}`);
      const t0 = Date.now();
      try {
        const r = await f.executar(args);
        await db.from("mcp_audit").insert({ ferramenta: nome, argumentos: args, ok: true, duracao_ms: Date.now() - t0, chave_id: chaveId });
        return resposta(p.id, { content: [{ type: "text", text: texto(r) }] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("mcp_audit").insert({ ferramenta: nome, argumentos: args, ok: false, erro: msg, duracao_ms: Date.now() - t0, chave_id: chaveId });
        // Erro de operação volta como resultado (isError), não como erro de
        // protocolo: o agente lê a mensagem e pode corrigir a chamada.
        return resposta(p.id, { content: [{ type: "text", text: msg }], isError: true });
      }
    }
    default:
      return falha(p.id, -32601, `método não suportado: ${p.method}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("MCP do Porceli System: use POST (Streamable HTTP, sem estado).", {
      status: 405, headers: { Allow: "POST" },
    });
  }

  const enviado = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  // Comparação por hash no banco: a chave em texto não fica guardada em lugar nenhum.
  const { data: chaveId } = enviado ? await db.rpc("mcp_validar_chave", { p_chave: enviado }) : { data: null };
  if (!chaveId) {
    return new Response(JSON.stringify(falha(null, -32001, "não autorizado")), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  let corpo: Pedido | Pedido[];
  try {
    corpo = await req.json();
  } catch {
    return Response.json(falha(null, -32700, "JSON inválido"), { status: 400 });
  }

  const lote = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = [];
  for (const p of lote) {
    if (p.id === undefined || p.id === null) continue; // notificação
    respostas.push(await atender(p, chaveId as string));
  }
  if (!respostas.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(corpo) ? respostas : respostas[0]);
});
