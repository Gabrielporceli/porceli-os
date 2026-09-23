/**
 * notes-import — traz as notas do cofre (repositório Git) para o CRM.
 *
 * Este é o caminho que importa de verdade: o módulo de Notas existe para
 * substituir o Notion, então as notas que já vivem no Obsidian precisam
 * aparecer no sistema. A `notes-sync` faz o sentido oposto (CRM → cofre).
 *
 * POLÍTICA DE CONFLITO, deliberadamente conservadora:
 *   • arquivo inalterado (mesmo sha)            → não faz nada;
 *   • nota com edição do CRM ainda não enviada  → NÃO sobrescreve, reporta;
 *   • qualquer outro caso                        → o cofre vence.
 *
 * ARQUIVO MOVIDO NÃO É ARQUIVO NOVO. Reorganizar pastas é uso normal do
 * Obsidian; casar só por `vault_path` faria cada nota movida virar duplicata,
 * e a original virar "ausente". A identificação tenta, em ordem:
 *   1. mesmo caminho              — o caso comum;
 *   2. mesmo blob sha             — moveu sem editar (o sha do git é do
 *                                   conteúdo, então move puro preserva ele);
 *   3. mesmo título               — moveu E editou; o título é o nome do
 *                                   arquivo, e é único dentro do cofre.
 * Casando, o `vault_path` é atualizado junto.
 * Apagar nota do CRM porque o arquivo sumiu do cofre NÃO acontece: apagar
 * é irreversível e um `git pull` malfeito não pode virar perda de dados.
 * Os ausentes são reportados para decisão humana.
 *
 * Entrada: POST {} (opcionalmente { dryRun: true })
 * Saída:   { ok, importadas, atualizadas, inalteradas, movidas[], conflitos[],
 *            ausentes[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { load } from "https://esm.sh/js-yaml@4.1.0";

const GITHUB = "https://api.github.com";
const NS = "porceli";
/** Quantos arquivos buscar em paralelo. Sequencial, 129 notas levariam ~20s. */
const LOTE = 8;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const gh = (token: string, url: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

/** Base64 → texto, aguentando acento (o conteúdo vem assim da API). */
function deBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Lê um `.md`. Tolerante de propósito: arquivo sem frontmatter ou com YAML
 * quebrado ainda vira nota — perder o corpo por causa de um dois-pontos
 * torto seria inaceitável. Espelha src/features/notes/markdown.ts.
 */
function lerMarkdown(texto: string) {
  const limpo = texto.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(limpo);
  let fm: Record<string, unknown> = {};
  let corpo = limpo;
  if (m) {
    corpo = limpo.slice(m[0].length);
    try {
      const lido = load(m[1]);
      if (lido && typeof lido === "object" && !Array.isArray(lido)) {
        fm = lido as Record<string, unknown>;
      }
    } catch { /* YAML inválido: trata como nota sem metadados */ }
  }
  const meu = (fm[NS] ?? {}) as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) if (k !== "tags" && k !== NS) extra[k] = v;

  const tags = Array.isArray(fm.tags)
    ? fm.tags.map(String).filter(Boolean)
    : typeof fm.tags === "string"
      ? fm.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    idFrontmatter: typeof meu.id === "string" ? meu.id : null,
    body: corpo.replace(/^\r?\n+/, "").trimEnd(),
    tags,
    clientId: typeof meu.client === "string" ? meu.client : null,
    leadId: typeof meu.lead === "string" ? meu.lead : null,
    extra,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const token = Deno.env.get("NOTES_GITHUB_TOKEN");
    const repo = Deno.env.get("NOTES_GITHUB_REPO");
    const branch = Deno.env.get("NOTES_GITHUB_BRANCH") ?? "main";
    if (!token) return json({ ok: false, error: "NOTES_GITHUB_TOKEN não configurado" }, 500);
    if (!repo) return json({ ok: false, error: "NOTES_GITHUB_REPO não configurado" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "sem Authorization" }, 401);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await db.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ ok: false, error: "sessão inválida" }, 401);

    const { dryRun } = await req.json().catch(() => ({ dryRun: false }));

    // 1. Árvore do repositório numa chamada só, em vez de navegar pasta a pasta.
    const tRes = await gh(token, `${GITHUB}/repos/${repo}/git/trees/${branch}?recursive=1`);
    if (!tRes.ok) {
      const corpo = await tRes.text();
      const msg = `GitHub ${tRes.status}: ${corpo.slice(0, 300)}`;
      console.error("notes-import falhou ao ler a árvore:", msg);
      return json({ ok: false, error: msg }, 502);
    }
    const arvore = await tRes.json();
    if (arvore.truncated) {
      // Acima de ~100k entradas o GitHub corta a resposta. Avisar é melhor
      // que importar um pedaço em silêncio.
      console.error("notes-import: árvore truncada pelo GitHub");
    }
    const arquivos: { path: string; sha: string }[] = (arvore.tree ?? [])
      .filter((n: { type: string; path: string }) => n.type === "blob" && n.path.toLowerCase().endsWith(".md"))
      .map((n: { path: string; sha: string }) => ({ path: n.path, sha: n.sha }));

    // 2. O que já existe no CRM, indexado pelo caminho no cofre.
    const { data: existentes, error: eSel } = await db
      .from("notes")
      .select("id, vault_path, git_sha, updated_at, synced_at, title");
    if (eSel) return json({ ok: false, error: `banco: ${eSel.message}` }, 500);

    const caminhosNoCofre = new Set(arquivos.map((f) => f.path));

    type Linha = NonNullable<typeof existentes>[number];
    const porCaminho = new Map<string, Linha>();
    const porSha = new Map<string, Linha>();
    const porTitulo = new Map<string, Linha>();
    for (const n of existentes ?? []) {
      if (n.vault_path) porCaminho.set(n.vault_path, n);
      // Só indexa sha e título quando não há ambiguidade: dois arquivos com o
      // mesmo conteúdo (ou o mesmo nome em pastas diferentes) tornariam o
      // casamento um chute, e chutar aqui sobrescreve a nota errada.
      if (n.git_sha) porSha.set(n.git_sha, porSha.has(n.git_sha) ? null as unknown as Linha : n);
      if (n.title) porTitulo.set(n.title, porTitulo.has(n.title) ? null as unknown as Linha : n);
    }

    const conflitos: string[] = [];
    const movidas: string[] = [];
    const paraBuscar: { path: string; sha: string; id: string | null }[] = [];
    let inalteradas = 0;

    /** Caminhos que já foram reivindicados, pra duas entradas da árvore não
     *  casarem com a mesma linha do banco. */
    const usadas = new Set<string>();

    for (const f of arquivos) {
      let atual = porCaminho.get(f.path);
      if (!atual) {
        const titulo = (f.path.split("/").pop() ?? f.path).replace(/\.md$/i, "");
        const candidato = porSha.get(f.sha) ?? porTitulo.get(titulo);
        // Só aceita se a linha candidata não corresponde a um arquivo que
        // ainda existe no cofre — senão não foi movida, são duas notas.
        if (candidato && candidato.vault_path && !usadas.has(candidato.id) &&
            !caminhosNoCofre.has(candidato.vault_path)) {
          atual = candidato;
          movidas.push(`${candidato.vault_path} → ${f.path}`);
        }
      }
      if (atual) usadas.add(atual.id);
      if (atual && atual.git_sha === f.sha && atual.vault_path === f.path) {
        inalteradas++;
        continue;
      }
      // Edição do CRM ainda não enviada ao cofre: importar apagaria o que
      // foi escrito aqui. Reporta em vez de decidir sozinho.
      const pendente = atual && (!atual.synced_at || new Date(atual.updated_at) > new Date(atual.synced_at));
      if (pendente) { conflitos.push(f.path); continue; }
      paraBuscar.push({ path: f.path, sha: f.sha, id: atual?.id ?? null });
    }

    // Arquivos do CRM que sumiram do cofre — só reporta, nunca apaga.
    // Nota reconhecida como movida NÃO entra aqui: o arquivo dela existe, só
    // mudou de lugar. Sem esse filtro toda reorganização de pasta viraria um
    // alarme falso de nota sumida.
    const ausentes = (existentes ?? [])
      .filter((n) => n.vault_path && !caminhosNoCofre.has(n.vault_path) && !usadas.has(n.id))
      .map((n) => n.vault_path as string);

    if (dryRun) {
      return json({
        ok: true, dryRun: true,
        aImportar: paraBuscar.filter((p) => !p.id).length,
        aAtualizar: paraBuscar.filter((p) => p.id).length,
        inalteradas, movidas, conflitos, ausentes,
      });
    }

    // 3. Busca os conteúdos em lotes e grava.
    let importadas = 0, atualizadas = 0;
    const falhas: string[] = [];
    // Um instante só para os dois campos. Chamar new Date() duas vezes pode
    // cair em milissegundos diferentes, e `updated_at > synced_at` passa a
    // significar "editada no CRM" — a nota vira conflito fantasma e nunca
    // mais é atualizada pelo cofre.
    const agora = new Date().toISOString();

    for (let i = 0; i < paraBuscar.length; i += LOTE) {
      const lote = paraBuscar.slice(i, i + LOTE);
      const conteudos = await Promise.all(
        lote.map(async (f) => {
          const r = await gh(token, `${GITHUB}/repos/${repo}/git/blobs/${f.sha}`);
          if (!r.ok) return null;
          const b = await r.json();
          return b.encoding === "base64" ? deBase64(b.content) : String(b.content ?? "");
        })
      );

      for (let k = 0; k < lote.length; k++) {
        const f = lote[k];
        const bruto = conteudos[k];
        if (bruto == null) { falhas.push(f.path); continue; }

        const lido = lerMarkdown(bruto);
        const barra = f.path.lastIndexOf("/");
        const linha = {
          user_id: userId,
          // No Obsidian o nome do arquivo É o nome da nota.
          title: (barra >= 0 ? f.path.slice(barra + 1) : f.path).replace(/\.md$/i, ""),
          folder: barra >= 0 ? f.path.slice(0, barra) : "",
          body: lido.body,
          tags: lido.tags,
          client_id: lido.clientId,
          lead_id: lido.leadId,
          extra_frontmatter: lido.extra,
          vault_path: f.path,
          git_sha: f.sha,
          synced_at: agora,
          updated_at: agora,
        };

        const res = f.id
          ? await db.from("notes").update(linha).eq("id", f.id)
          : await db.from("notes").insert(linha);
        if (res.error) { falhas.push(`${f.path}: ${res.error.message}`); continue; }
        if (f.id) atualizadas++; else importadas++;
      }
    }

    return json({
      ok: true,
      total: arquivos.length,
      importadas, atualizadas, inalteradas, movidas,
      conflitos, ausentes, falhas,
      truncado: Boolean(arvore.truncated),
    });
  } catch (e) {
    console.error("notes-import erro:", String(e));
    return json({ ok: false, error: String(e) }, 500);
  }
});
