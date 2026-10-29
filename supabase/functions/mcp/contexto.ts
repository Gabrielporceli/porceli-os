// Peças comuns do MCP: cliente do banco, o dono do sistema e a chamada às
// outras Edge Functions do jeito que a tela chama (com a sessão do dono).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
/** O sistema tem um dono só; é em nome dele que o Hermes age. */
const DONO_EMAIL = Deno.env.get("MCP_OWNER_EMAIL") ?? "";

export const db = createClient(URL_SUPABASE, SERVICE_KEY, { auth: { persistSession: false } });

let donoId: string | null = null;
let sessaoCache: { token: string; expira: number } | null = null;

/**
 * id do dono — o `user.id` que a tela usa em todo `user_id`. Vem do banco,
 * sem abrir sessão: operação que só grava no banco não depende do serviço de
 * autenticação (que às vezes responde 502).
 */
export async function dono(): Promise<{ id: string }> {
  if (donoId) return { id: donoId };
  if (!DONO_EMAIL) throw new Error("MCP_OWNER_EMAIL não configurado");
  const { data, error } = await db.rpc("mcp_sql", {
    p_query: `select id from auth.users where lower(email) = lower('${DONO_EMAIL.replace(/'/g, "''")}')`,
  });
  const id = (data as { linhas?: { id: string }[] } | null)?.linhas?.[0]?.id;
  if (error || !id) throw new Error(`dono não encontrado: ${error?.message ?? DONO_EMAIL}`);
  donoId = id;
  return { id };
}

/**
 * JWT de sessão do dono, para chamar as funções que a tela chama com o
 * usuário logado. O link mágico gerado pelo admin NÃO envia e-mail: só
 * devolve o hash, que vira sessão aqui. Uma nova tentativa se o Auth falhar.
 */
async function sessaoDoDono(): Promise<string> {
  if (sessaoCache && sessaoCache.expira > Date.now() + 60_000) return sessaoCache.token;
  let ultimoErro = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: DONO_EMAIL });
      if (error || !link?.properties?.hashed_token) throw new Error(error?.message ?? "sem hash");
      const anon = createClient(URL_SUPABASE, ANON_KEY, { auth: { persistSession: false } });
      const { data: s, error: e2 } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
      if (e2 || !s.session) throw new Error(e2?.message ?? "sem sessão");
      sessaoCache = { token: s.session.access_token, expira: (s.session.expires_at ?? 0) * 1000 };
      return sessaoCache.token;
    } catch (e) {
      ultimoErro = (e as Error).message;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw new Error(`sessão do dono: ${ultimoErro}`);
}

/**
 * Chama outra Edge Function exatamente como `supabase.functions.invoke` da
 * tela: com a sessão do dono. Devolve o corpo (JSON) — inclusive quando a
 * função responde `{ success: false }`, que a tela trata como falha de negócio.
 */
export async function invocar(
  nome: string,
  corpo?: unknown,
  opcoes: { metodo?: "GET" | "POST"; query?: Record<string, string>; comoServico?: boolean } = {},
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const metodo = opcoes.metodo ?? "POST";
  const token = opcoes.comoServico ? SERVICE_KEY : await sessaoDoDono();
  // Como serviço, a MESMA chave nos dois cabeçalhos ("Conflicting API keys").
  const apikey = opcoes.comoServico ? SERVICE_KEY : ANON_KEY;
  const url = new URL(`${URL_SUPABASE}/functions/v1/${nome}`);
  for (const [k, v] of Object.entries(opcoes.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, apikey, "Content-Type": "application/json" },
    body: metodo === "GET" ? undefined : JSON.stringify(corpo ?? {}),
    signal: AbortSignal.timeout(55_000),
  });
  const bruto = await res.text();
  let dado: unknown = bruto;
  try { dado = JSON.parse(bruto); } catch { /* texto puro */ }
  if (!res.ok) {
    const msg = typeof dado === "object" && dado && "error" in dado ? String((dado as { error: unknown }).error) : bruto.slice(0, 800);
    throw new Error(`${nome} respondeu ${res.status}: ${msg}`);
  }
  return dado;
}

/** Uma ferramenta do MCP: o que o Hermes vê (descrição, parâmetros) e o que roda. */
export type Ferramenta = {
  description: string;
  inputSchema: Record<string, unknown>;
  // deno-lint-ignore no-explicit-any
  executar: (args: any) => Promise<unknown>;
};

/** Esquema de objeto JSON para os parâmetros de uma ferramenta. */
export function parametros(props: Record<string, unknown>, obrigatorios: string[] = []) {
  return { type: "object", properties: props, required: obrigatorios };
}

/** Data de hoje em YYYY-MM-DD no fuso do negócio (a tela roda em São Paulo). */
export function hojeSP(): string {
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function exigir<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined || valor === "") throw new Error(mensagem);
  return valor;
}
