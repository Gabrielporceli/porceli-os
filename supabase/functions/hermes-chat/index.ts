// ─────────────────────────────────────────────────────────────────────────
// hermes-chat — o terminal do agente (Central de Agentes) conversa com o
// Hermes da VPS por aqui.
//
// O navegador nunca vê a senha da API do Hermes: ela fica nos secrets desta
// função (HERMES_URL, HERMES_API_KEY). Só entra quem está logado no sistema.
//
// POST { agente, mensagem, sessao } → SSE do Hermes repassado como veio
// (chunks de chat.completion + eventos hermes.tool.progress).
//   agente: profile do Hermes (elly, analista…)
//   sessao: id da conversa; o histórico fica no Hermes, não no navegador.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Profiles que existem no Hermes. Qualquer outro nome é recusado aqui. */
const AGENTES = new Set([
  "elly", "especialista-tracking", "especialista-os", "analista", "estrategista",
  "operador-meta", "operador-google", "cro", "pesquisa",
]);

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);

  const url = Deno.env.get("HERMES_URL");
  const chave = Deno.env.get("HERMES_API_KEY");
  if (!url || !chave) return json({ erro: "HERMES_URL e HERMES_API_KEY não configurados" }, 500);

  // Quem está chamando precisa estar logado no sistema.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user } } = await supa.auth.getUser(token);
  if (!user) return json({ erro: "não autenticado" }, 401);

  let corpo: { agente?: string; mensagem?: string; sessao?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "corpo inválido" }, 400);
  }
  const { agente = "", mensagem = "", sessao = "" } = corpo;
  if (!AGENTES.has(agente)) return json({ erro: `agente desconhecido: ${agente}` }, 400);
  if (!mensagem.trim()) return json({ erro: "mensagem vazia" }, 400);
  if (mensagem.length > 20_000) return json({ erro: "mensagem grande demais" }, 400);
  if (!/^os-[a-z0-9-]{8,100}$/.test(sessao)) return json({ erro: "sessão inválida" }, 400);

  let resp: Response;
  try {
    resp = await fetch(`${url.replace(/\/$/, "")}/p/${agente}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        // O Hermes guarda o histórico desta conversa e continua de onde parou.
        "X-Hermes-Session-Id": sessao,
      },
      body: JSON.stringify({ model: agente, stream: true, messages: [{ role: "user", content: mensagem }] }),
      signal: req.signal,
    });
  } catch (e) {
    return json({ erro: `Hermes fora do ar: ${(e as Error).message}` }, 502);
  }
  if (!resp.ok || !resp.body) {
    const detalhe = await resp.text().catch(() => "");
    return json({ erro: `Hermes respondeu ${resp.status}`, detalhe: detalhe.slice(0, 500) }, 502);
  }

  return new Response(resp.body, {
    headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
