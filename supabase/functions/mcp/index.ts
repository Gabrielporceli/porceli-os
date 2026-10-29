// ─────────────────────────────────────────────────────────────────────────
// MCP do Porceli System — o Hermes controla o sistema por aqui.
//
// Protocolo: MCP sobre Streamable HTTP, sem estado (cada POST é uma chamada
// JSON-RPC completa, a resposta vem em JSON). Escrito à mão, sem SDK: o que o
// Hermes usa é initialize, tools/list, tools/call e ping, e isso cabe aqui
// sem depender de versão de biblioteca no Deno.
//
// Autenticação: `Authorization: Bearer <HERMES_MCP_TOKEN>`. verify_jwt fica
// desligado no config.toml porque a chave é nossa, não um JWT do Supabase.
//
// Poder: total, por decisão do dono — ferramentas por módulo, CRUD em qualquer
// tabela, SQL livre com escrita e chamada de qualquer Edge Function. Os
// limites são três: o Vault (segredos) fica fora, comando destrutivo exige
// `confirmar_destrutivo: true`, e toda chamada vai para `mcp_audit`.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TOKEN = Deno.env.get("HERMES_MCP_TOKEN") ?? "";
/** O sistema tem um dono só; é em nome dele que o Hermes age. */
const DONO_EMAIL = Deno.env.get("MCP_OWNER_EMAIL") ?? "";

const db = createClient(URL_SUPABASE, SERVICE_KEY, { auth: { persistSession: false } });

const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];
/** Resposta grande demais estoura o contexto do agente: corta e avisa. */
const MAX_TEXTO = 60_000;

// ── Utilidades ────────────────────────────────────────────────────────────

function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function texto(dado: unknown): string {
  const s = typeof dado === "string" ? dado : JSON.stringify(dado, null, 2);
  return s.length > MAX_TEXTO
    ? s.slice(0, MAX_TEXTO) + `\n\n[cortado: ${s.length} caracteres no total — refine a consulta ou use limite]`
    : s;
}

let donoCache: { id: string; token: string; expira: number } | null = null;

/** id do dono (para preencher `user_id`) e um JWT de sessão dele. */
async function dono(): Promise<{ id: string; token: string }> {
  if (donoCache && donoCache.expira > Date.now() + 60_000) return donoCache;
  if (!DONO_EMAIL) throw new Error("MCP_OWNER_EMAIL não configurado");
  // Funções como notion-tasks e google-calendar-events só aceitam sessão de
  // usuário (auth.getUser). O link mágico gerado pelo admin NÃO envia e-mail:
  // só devolve o hash, que vira uma sessão aqui mesmo.
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: DONO_EMAIL });
  if (error || !link?.properties?.hashed_token) throw new Error(`sessão do dono: ${error?.message ?? "sem hash"}`);
  const anon = createClient(URL_SUPABASE, ANON_KEY, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (e2 || !s.session) throw new Error(`sessão do dono: ${e2?.message ?? "sem sessão"}`);
  donoCache = {
    id: s.session.user.id,
    token: s.session.access_token,
    expira: (s.session.expires_at ?? 0) * 1000,
  };
  return donoCache;
}

async function sql(query: string): Promise<unknown> {
  const { data, error } = await db.rpc("mcp_sql", { p_query: query });
  if (error) throw new Error(error.message);
  return data;
}

const colunasCache = new Map<string, { coluna: string; tipo: string; nula: string; padrao: string | null }[]>();
async function colunas(tabela: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(tabela)) throw new Error(`nome de tabela inválido: ${tabela}`);
  if (colunasCache.has(tabela)) return colunasCache.get(tabela)!;
  const r = await sql(
    `select column_name as coluna, data_type as tipo, is_nullable as nula, column_default as padrao
       from information_schema.columns where table_schema='public' and table_name='${tabela}'
      order by ordinal_position`,
  ) as { linhas: { coluna: string; tipo: string; nula: string; padrao: string | null }[] };
  if (!r.linhas.length) throw new Error(`tabela não existe: ${tabela}`);
  colunasCache.set(tabela, r.linhas);
  return r.linhas;
}

type Filtro = { coluna: string; op?: string; valor?: unknown };

// deno-lint-ignore no-explicit-any
function aplicarFiltros(q: any, filtros: Filtro[] = []) {
  for (const f of filtros) {
    const op = (f.op ?? "eq").toLowerCase();
    if (op === "in") q = q.in(f.coluna, Array.isArray(f.valor) ? f.valor : [f.valor]);
    else if (op === "is") q = q.is(f.coluna, f.valor as null | boolean);
    else q = q.filter(f.coluna, op, f.valor);
  }
  return q;
}

/** Chama outra Edge Function do sistema, como serviço ou como o dono. */
async function chamarFuncao(nome: string, metodo = "POST", corpo?: unknown, como: "servico" | "usuario" = "servico", query?: Record<string, string>) {
  if (!/^[a-z0-9-]+$/.test(nome) || nome === "mcp") throw new Error(`função inválida: ${nome}`);
  const token = como === "usuario" ? (await dono()).token : SERVICE_KEY;
  // Como serviço, a MESMA chave nos dois cabeçalhos: o gateway recusa
  // ("Conflicting API keys") quando apikey e Authorization trazem chaves
  // diferentes. Como usuário, apikey pública + JWT da sessão.
  const apikey = como === "usuario" ? ANON_KEY : SERVICE_KEY;
  const url = new URL(`${URL_SUPABASE}/functions/v1/${nome}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, apikey, "Content-Type": "application/json" },
    body: metodo === "GET" ? undefined : JSON.stringify(corpo ?? {}),
    signal: AbortSignal.timeout(55_000),
  });
  const bruto = await res.text();
  let dado: unknown = bruto;
  try { dado = JSON.parse(bruto); } catch { /* texto puro */ }
  if (!res.ok) throw new Error(`${nome} respondeu ${res.status}: ${texto(dado).slice(0, 1500)}`);
  return dado;
}

const DESTRUTIVO = /\b(drop|truncate)\b|\bdelete\s+from\s+[\w."]+\s*(;|$)|\bupdate\s+[\w."]+\s+set\b(?![\s\S]*\bwhere\b)|\balter\s+table\b[\s\S]*\bdrop\b/i;

// ── Ferramentas ───────────────────────────────────────────────────────────

const filtroSchema = {
  type: "array",
  description: "Condições combinadas com E. op: eq, neq, gt, gte, lt, lte, like, ilike, is, in. Ex.: [{\"coluna\":\"stage\",\"op\":\"eq\",\"valor\":\"novo\"}]",
  items: {
    type: "object",
    properties: { coluna: { type: "string" }, op: { type: "string" }, valor: {} },
    required: ["coluna"],
  },
};

const GUIA = `# Porceli System — guia para o Hermes

Sistema de gestão da agência Porceli (CRM, financeiro, contratos, agenda,
tarefas, notas, WhatsApp). Banco Postgres (Supabase). Um único dono: tudo que
você cria é dele (o MCP preenche user_id sozinho quando a tabela tem essa coluna).

## Módulos e tabelas principais
- Clientes: clients (cadastro), plans (planos), tags.
- Contratos: contracts (mensalidade, início/fim, status, cobrança Asaas).
- Financeiro: financial_entries (lançamentos gerados dos contratos), finances (despesas/receitas avulsas).
- CRM/Leads (Kanban): leads (stage = id da etapa em stages; value em reais, número), stages (colunas do Kanban), lead_events.
- Agenda: google_calendar_events (espelho do Google Agenda) — para criar/alterar use agenda_google.
- Tarefas: notion_tasks (espelho do Notion) — para criar/alterar use tarefas_notion.
- Notas: notes (corpo em markdown), note_boards. Depois de alterar uma nota, chame chamar_funcao("notes-sync", {noteId}, como "usuario") para espelhar no GitHub.
- WhatsApp: whatsapp_outbox (fila de envio), scheduled_messages (mensagens agendadas), whatsapp_status.
- Automações: automations (crons do sistema) — use automacoes.
- Ideias de conteúdo: content_ideas. Funis: funnel_maps.
- Logs: cron_runs (GRANDE, sempre filtre por data e use limite), notification_logs, mcp_audit (suas próprias chamadas).

## Regras
- Valores monetários são números em reais (1500.5), nunca texto "R$ 1.500,50".
- Datas em ISO 8601; fuso do negócio: America/Sao_Paulo.
- Antes de escrever numa tabela que você não conhece, use descrever_tabela.
- Comandos destrutivos (DROP, TRUNCATE, DELETE/UPDATE sem WHERE) exigem confirmar_destrutivo: true.
- O Vault (segredos) não é acessível.
- A instância do banco é pequena: consultas pesadas (cron_runs sem filtro) derrubam o sistema.

## Funções do sistema (chamar_funcao)
asaas-new-client, asaas-payment-alerts, asaas-payment-reconciliation, asaas-renegotiation,
daily-summary, financial-alert, task-reminder, meta-ads-report, send-scheduled-messages,
whatsapp-outbox, whatsapp-health, notes-sync (como usuario), notion-tasks (como usuario),
google-calendar-events (como usuario), manage-automations, cleanup-media.
`;

type Ferramenta = {
  description: string;
  inputSchema: Record<string, unknown>;
  // deno-lint-ignore no-explicit-any
  executar: (a: any) => Promise<unknown>;
};

const FERRAMENTAS: Record<string, Ferramenta> = {
  guia_do_sistema: {
    description: "Explica o Porceli System: módulos, tabelas, regras e funções. Leia antes de agir pela primeira vez.",
    inputSchema: { type: "object", properties: {} },
    executar: async () => GUIA,
  },

  listar_tabelas: {
    description: "Lista as tabelas do sistema com quantidade aproximada de linhas.",
    inputSchema: { type: "object", properties: {} },
    executar: () => sql(
      `select c.relname as tabela, c.reltuples::bigint as linhas_aprox
         from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' order by 1`,
    ),
  },

  descrever_tabela: {
    description: "Colunas de uma tabela: nome, tipo, se aceita nulo e valor padrão.",
    inputSchema: { type: "object", properties: { tabela: { type: "string" } }, required: ["tabela"] },
    executar: ({ tabela }) => colunas(tabela),
  },

  buscar: {
    description: "Lê linhas de uma tabela com filtros, ordem e limite (padrão 50, máx. 1000).",
    inputSchema: {
      type: "object",
      properties: {
        tabela: { type: "string" },
        colunas: { type: "string", description: "Lista separada por vírgula. Padrão: todas (*)." },
        filtros: filtroSchema,
        ordenar: { type: "string", description: "coluna ou coluna.desc" },
        limite: { type: "number" },
      },
      required: ["tabela"],
    },
    executar: async ({ tabela, colunas: cols, filtros, ordenar, limite }) => {
      await colunas(tabela);
      let q = db.from(tabela).select(cols || "*");
      q = aplicarFiltros(q, filtros);
      if (ordenar) {
        const [c, dir] = String(ordenar).split(".");
        q = q.order(c, { ascending: dir !== "desc" });
      }
      const { data, error } = await q.limit(Math.min(Number(limite) || 50, 1000));
      if (error) throw new Error(error.message);
      return data;
    },
  },

  inserir: {
    description: "Insere uma ou mais linhas. user_id é preenchido com o dono se a tabela tiver essa coluna e você não informar. Devolve as linhas criadas.",
    inputSchema: {
      type: "object",
      properties: { tabela: { type: "string" }, registros: { type: "array", items: { type: "object" } } },
      required: ["tabela", "registros"],
    },
    executar: async ({ tabela, registros }) => {
      const cols = await colunas(tabela);
      const temUser = cols.some((c) => c.coluna === "user_id");
      const id = temUser ? (await dono()).id : null;
      const linhas = (registros as Record<string, unknown>[]).map((r) => (temUser && !r.user_id ? { ...r, user_id: id } : r));
      const { data, error } = await db.from(tabela).insert(linhas).select();
      if (error) throw new Error(error.message);
      return data;
    },
  },

  atualizar: {
    description: "Atualiza as linhas que batem com os filtros (obrigatórios). Devolve as linhas alteradas.",
    inputSchema: {
      type: "object",
      properties: { tabela: { type: "string" }, filtros: filtroSchema, valores: { type: "object" } },
      required: ["tabela", "filtros", "valores"],
    },
    executar: async ({ tabela, filtros, valores }) => {
      await colunas(tabela);
      if (!Array.isArray(filtros) || !filtros.length) throw new Error("atualizar exige ao menos um filtro");
      const { data, error } = await aplicarFiltros(db.from(tabela).update(valores), filtros).select();
      if (error) throw new Error(error.message);
      return { linhas_alteradas: data?.length ?? 0, linhas: data };
    },
  },

  excluir: {
    description: "Exclui as linhas que batem com os filtros (obrigatórios). Devolve o que foi excluído.",
    inputSchema: {
      type: "object",
      properties: { tabela: { type: "string" }, filtros: filtroSchema },
      required: ["tabela", "filtros"],
    },
    executar: async ({ tabela, filtros }) => {
      await colunas(tabela);
      if (!Array.isArray(filtros) || !filtros.length) throw new Error("excluir exige ao menos um filtro");
      const { data, error } = await aplicarFiltros(db.from(tabela).delete(), filtros).select();
      if (error) throw new Error(error.message);
      return { linhas_excluidas: data?.length ?? 0, linhas: data };
    },
  },

  sql: {
    description: "SQL livre no banco (leitura e escrita). SELECT devolve as linhas; INSERT/UPDATE/DELETE com RETURNING devolvem o gravado. Timeout de 15 s. DROP, TRUNCATE e DELETE/UPDATE sem WHERE exigem confirmar_destrutivo: true.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, confirmar_destrutivo: { type: "boolean" } },
      required: ["query"],
    },
    executar: async ({ query, confirmar_destrutivo }) => {
      if (DESTRUTIVO.test(query) && confirmar_destrutivo !== true) {
        throw new Error("comando destrutivo: repita com confirmar_destrutivo: true se é mesmo isso que você quer");
      }
      const r = await sql(query);
      colunasCache.clear(); // DDL pode ter mudado a estrutura
      return r;
    },
  },

  enviar_whatsapp: {
    description: "Envia uma mensagem de WhatsApp pelo número do sistema. Entra na fila (whatsapp_outbox) e o worker envia em seguida, com retentativa. Número com DDI (5565999999999) ou JID de grupo (…@g.us).",
    inputSchema: {
      type: "object",
      properties: { numero: { type: "string" }, mensagem: { type: "string" } },
      required: ["numero", "mensagem"],
    },
    executar: async ({ numero, mensagem }) => {
      const { data, error } = await db.from("whatsapp_outbox").insert({
        number: String(numero).includes("@") ? numero : String(numero).replace(/\D/g, ""),
        text: mensagem,
        source: "hermes",
        dedupe_key: `hermes:${crypto.randomUUID()}`,
      }).select("id").single();
      if (error) throw new Error(error.message);
      // Não espera o cron: dispara o worker já.
      chamarFuncao("whatsapp-outbox").catch(() => {});
      return { enfileirada: true, id: data.id };
    },
  },

  tarefas_notion: {
    description: "Tarefas no Notion. acao: listar | criar | atualizar | excluir. dados — criar: {title, dueDate?, client?, ...}; atualizar: {task_id, ...campos}; excluir: {task_id}. Para só ler, buscar na tabela notion_tasks é mais rápido.",
    inputSchema: {
      type: "object",
      properties: { acao: { type: "string", enum: ["listar", "criar", "atualizar", "excluir"] }, dados: { type: "object" } },
      required: ["acao"],
    },
    executar: ({ acao, dados }) => {
      if (acao === "listar") return chamarFuncao("notion-tasks", "GET", undefined, "usuario");
      const action = { criar: "CREATE_TASK", atualizar: "UPDATE_TASK", excluir: "DELETE_TASK" }[acao as string];
      return chamarFuncao("notion-tasks", "POST", { ...(dados ?? {}), action }, "usuario");
    },
  },

  agenda_google: {
    description: "Google Agenda do dono. acao: listar | criar | atualizar | excluir. dados — listar: {timeMin, timeMax} (ISO); criar: {title, start, end?, description?}; atualizar: {eventId, title?, start?, end?}; excluir: {eventId}.",
    inputSchema: {
      type: "object",
      properties: { acao: { type: "string", enum: ["listar", "criar", "atualizar", "excluir"] }, dados: { type: "object" } },
      required: ["acao"],
    },
    executar: ({ acao, dados }) => {
      const d = (dados ?? {}) as Record<string, string>;
      if (acao === "listar") {
        return chamarFuncao("google-calendar-events", "GET", undefined, "usuario",
          d.timeMin && d.timeMax ? { timeMin: d.timeMin, timeMax: d.timeMax } : undefined);
      }
      const action = { criar: "CREATE_EVENT", atualizar: "UPDATE_EVENT", excluir: "DELETE_EVENT" }[acao as string];
      return chamarFuncao("google-calendar-events", "POST", { ...d, action }, "usuario");
    },
  },

  automacoes: {
    description: "Automações (crons) do sistema. acao: listar | ligar | desligar | reagendar | disparar. dados: {id?, jobname?, function_name?, schedule?}.",
    inputSchema: {
      type: "object",
      properties: { acao: { type: "string", enum: ["listar", "ligar", "desligar", "reagendar", "disparar"] }, dados: { type: "object" } },
      required: ["acao"],
    },
    executar: ({ acao, dados }) => {
      const d = (dados ?? {}) as Record<string, unknown>;
      // Lista pela tabela: o GET da manage-automations quebra (`.catch` num
      // query builder) e o app nunca o usou — só as ações POST abaixo.
      if (acao === "listar") {
        return db.from("automations").select("*").order("category").order("display_name")
          .then(({ data, error }) => { if (error) throw new Error(error.message); return data; });
      }
      if (acao === "ligar" || acao === "desligar") {
        return chamarFuncao("manage-automations", "POST", { ...d, action: "toggle", enabled: acao === "ligar" });
      }
      if (acao === "reagendar") return chamarFuncao("manage-automations", "POST", { ...d, action: "update_schedule" });
      return chamarFuncao("manage-automations", "POST", { ...d, action: "trigger" });
    },
  },

  chamar_funcao: {
    description: "Chama qualquer Edge Function do sistema (ver guia_do_sistema). como: servico (padrão) ou usuario (para as que exigem sessão do dono).",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        metodo: { type: "string", enum: ["GET", "POST"] },
        corpo: { type: "object" },
        como: { type: "string", enum: ["servico", "usuario"] },
      },
      required: ["nome"],
    },
    executar: ({ nome, metodo, corpo, como }) => chamarFuncao(nome, metodo ?? "POST", corpo, como ?? "servico"),
  },
};

// ── JSON-RPC ──────────────────────────────────────────────────────────────

type Pedido = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const resposta = (id: Pedido["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const falha = (id: Pedido["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function atender(p: Pedido) {
  switch (p.method) {
    case "initialize": {
      const pedida = String(p.params?.protocolVersion ?? "");
      return resposta(p.id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "porceli-system", version: "1.0.0" },
        instructions: "Controle do Porceli System. Comece por guia_do_sistema.",
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
        await db.from("mcp_audit").insert({ ferramenta: nome, argumentos: args, ok: true, duracao_ms: Date.now() - t0 });
        return resposta(p.id, { content: [{ type: "text", text: texto(r) }] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("mcp_audit").insert({ ferramenta: nome, argumentos: args, ok: false, erro: msg, duracao_ms: Date.now() - t0 });
        // Erro de ferramenta volta como resultado (isError), não como erro de
        // protocolo: assim o agente lê a mensagem e pode corrigir a chamada.
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

  const enviado = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!TOKEN || !iguaisEmTempoConstante(enviado, TOKEN)) {
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
    // Notificação (sem id): só confirma o recebimento.
    if (p.id === undefined || p.id === null) continue;
    respostas.push(await atender(p));
  }
  if (!respostas.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(corpo) ? respostas : respostas[0]);
});
