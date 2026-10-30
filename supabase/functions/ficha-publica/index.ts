// ─────────────────────────────────────────────────────────────────────────
// ficha-publica — o dono do negócio responde a ficha pelo link que a agência
// mandou (/ficha/<token>), sem login.
//
// GET  ?t=<token>                 → empresa e respostas atuais
// POST { t, respostas }           → grava as respostas
//
// O token é o único acesso: só vale até `link_expira_em`, só lê e grava a ficha
// daquele cliente e só as chaves da ficha (src/features/clients/fichaCampos.ts).
// Nada do resto do sistema passa por aqui.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CHAVES_FICHA, limparRespostas } from "../../../src/features/clients/fichaCampos.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const TOKEN = /^[a-f0-9]{48}$/;

async function fichaDoToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const { data } = await db.from("client_fichas")
    .select(`id, client_id, link_expira_em, respondido_cliente_em, ${CHAVES_FICHA.join(", ")}`)
    .eq("link_token", token).maybeSingle();
  const f = data as Record<string, unknown> | null;
  if (!f || !f.link_expira_em || new Date(String(f.link_expira_em)) < new Date()) return null;
  return f;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method === "GET") {
    const f = await fichaDoToken(new URL(req.url).searchParams.get("t") ?? "");
    if (!f) return json({ erro: "Link inválido ou expirado. Peça um novo para a agência." }, 404);
    const { data: c } = await db.from("clients").select("company").eq("id", f.client_id).maybeSingle();
    const respostas: Record<string, unknown> = {};
    for (const k of CHAVES_FICHA) respostas[k] = f[k] ?? null;
    return json({ empresa: c?.company ?? "", respostas, respondido_em: f.respondido_cliente_em ?? null });
  }

  if (req.method === "POST") {
    if (Number(req.headers.get("content-length") ?? 0) > 100_000) return json({ erro: "Respostas grandes demais." }, 413);
    let corpo: { t?: string; respostas?: Record<string, unknown> };
    try {
      corpo = await req.json();
    } catch {
      return json({ erro: "Corpo inválido." }, 400);
    }
    const f = await fichaDoToken(String(corpo.t ?? ""));
    if (!f) return json({ erro: "Link inválido ou expirado. Peça um novo para a agência." }, 404);
    if (!corpo.respostas || typeof corpo.respostas !== "object") return json({ erro: "Sem respostas." }, 400);

    const limpas = limparRespostas(corpo.respostas);
    for (const k of ["margem_percentual", "conversao_percentual"]) {
      const v = limpas[k];
      if (typeof v === "number" && (v < 0 || v > 100)) return json({ erro: "Percentuais vão de 0 a 100." }, 400);
    }
    const { error } = await db.from("client_fichas")
      .update({ ...limpas, preenchido_por: "cliente", respondido_cliente_em: new Date().toISOString() })
      .eq("id", f.id);
    if (error) return json({ erro: "Não consegui salvar. Tente de novo em instantes." }, 500);
    return json({ ok: true });
  }

  return json({ erro: "Método não aceito." }, 405);
});
