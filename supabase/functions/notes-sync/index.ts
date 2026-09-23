/**
 * notes-sync — grava as notas do CRM como arquivos .md num repositório Git,
 * que é o cofre do Obsidian.
 *
 * Por que uma Edge Function e não o navegador: o token do GitHub não pode
 * chegar ao cliente. `notes_sync_config` é lida via RLS pelo próprio
 * navegador, então o token vive aqui, como secret.
 *
 * Direção: SÓ DE IDA (CRM → cofre), por enquanto. Ler mudanças feitas no
 * Obsidian exige política de conflito, e o campo `git_sha` existe para isso:
 * é o SHA do blob na última sincronização, e SHA divergente é a definição de
 * conflito. Ver docs/NOTAS-OBSIDIAN.md, seção 5.
 *
 * Entrada:  POST { noteId: string }
 * Saída:    { ok, path, sha } ou { ok: false, error }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dump } from "https://esm.sh/js-yaml@4.1.0";

const GITHUB = "https://api.github.com";
const NS = "porceli";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/**
 * Serialização Markdown + frontmatter.
 *
 * Duplica src/features/notes/markdown.ts de propósito: o Deno da Edge
 * Function não compartilha o bundle do front. As REGRAS têm que andar
 * juntas — se uma mudar, a outra muda. As duas essenciais:
 *   • `tags` na raiz (chave nativa do Obsidian);
 *   • chaves desconhecidas preservadas, senão a sincronização apaga em
 *     silêncio o que foi escrito no Obsidian.
 */
function toMarkdown(n: {
  id: string;
  tags: string[] | null;
  client_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  body: string;
  extra_frontmatter: Record<string, unknown> | null;
}): string {
  const fm: Record<string, unknown> = { ...(n.extra_frontmatter ?? {}) };
  if (n.tags?.length) fm.tags = [...n.tags];
  else delete fm.tags;

  const meu: Record<string, unknown> = { id: n.id };
  if (n.client_id) meu.client = n.client_id;
  if (n.lead_id) meu.lead = n.lead_id;
  if (n.created_at) meu.created = n.created_at;
  if (n.updated_at) meu.updated = n.updated_at;
  fm[NS] = meu;

  const yaml = String(dump(fm, { lineWidth: -1, noRefs: true, sortKeys: false })).trimEnd();
  return `---\n${yaml}\n---\n\n${n.body.trimEnd()}\n`;
}

/** O conteúdo vai em base64 para a API do GitHub; precisa aguentar acento. */
function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function githubPUT(
  token: string,
  repo: string,
  caminho: string,
  corpo: Record<string, unknown>
) {
  const r = await fetch(`${GITHUB}/repos/${repo}/contents/${encodeURI(caminho)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
  });
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const token = Deno.env.get("NOTES_GITHUB_TOKEN");
    if (!token) return json({ ok: false, error: "NOTES_GITHUB_TOKEN não configurado" }, 500);

    // Cliente com o JWT de quem chamou: a RLS continua valendo, então esta
    // função nunca enxerga nota de outro usuário.
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "sem Authorization" }, 401);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    const { noteId, renamedFrom } = await req.json();
    if (!noteId) return json({ ok: false, error: "noteId ausente" }, 400);

    const { data: nota, error: e1 } = await db.from("notes").select("*").eq("id", noteId).single();
    if (e1 || !nota) return json({ ok: false, error: "nota não encontrada" }, 404);

    const { data: cfg, error: e2 } = await db.from("notes_sync_config").select("*").single();
    if (e2 || !cfg) return json({ ok: false, error: "sincronização não configurada" }, 400);
    if (!cfg.enabled) return json({ ok: false, error: "sincronização desligada" }, 400);

    const base = String(cfg.base_path ?? "").replace(/^\/+|\/+$/g, "");
    const caminho = [base, nota.vault_path].filter(Boolean).join("/");

    const conteudo = toMarkdown(nota);

    // O SHA do blob é obrigatório para SOBRESCREVER um arquivo existente.
    // Guardamos o da última sincronização; se o arquivo nunca foi enviado,
    // vai sem sha e a API cria.
    const put = await githubPUT(token, cfg.repo, caminho, {
      message: `notas: ${nota.title}`,
      content: paraBase64(conteudo),
      branch: cfg.branch,
      ...(nota.git_sha ? { sha: nota.git_sha } : {}),
    });

    if (!put.ok) {
      // 409 aqui quase sempre significa que o arquivo mudou no repositório
      // desde a última sincronização — ou seja, foi editado no Obsidian.
      // Enquanto a sincronização é só de ida, reportamos em vez de
      // sobrescrever às cegas.
      const msg =
        put.status === 409
          ? "conflito: o arquivo mudou no cofre desde a última sincronização"
          : `GitHub ${put.status}: ${JSON.stringify(put.body).slice(0, 300)}`;
      await db.from("notes_sync_config").update({ last_error: msg }).eq("user_id", nota.user_id);
      return json({ ok: false, error: msg }, 409);
    }

    const novoSha = (put.body as { content?: { sha?: string } })?.content?.sha ?? null;

    await db
      .from("notes")
      .update({ git_sha: novoSha, synced_at: new Date().toISOString() })
      .eq("id", noteId);

    // Renomeada: apaga o arquivo antigo, senão fica órfão no cofre.
    if (renamedFrom) {
      const antigo = [base, renamedFrom].filter(Boolean).join("/");
      const info = await fetch(
        `${GITHUB}/repos/${cfg.repo}/contents/${encodeURI(antigo)}?ref=${cfg.branch}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (info.ok) {
        const { sha } = await info.json();
        await fetch(`${GITHUB}/repos/${cfg.repo}/contents/${encodeURI(antigo)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: `notas: remove ${renamedFrom}`, sha, branch: cfg.branch }),
        });
      }
    }

    await db
      .from("notes_sync_config")
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq("user_id", nota.user_id);

    return json({ ok: true, path: caminho, sha: novoSha });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
