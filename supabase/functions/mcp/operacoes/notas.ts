// Notas — mesmo passo a passo de src/features/notes/useNotes.ts e sync.ts:
// grava com o caminho no cofre e espelha no GitHub (notes-sync).
import { db, dono, exigir, Ferramenta, invocar, parametros } from "../contexto.ts";

// Iguais a tituloParaArquivo/caminhoNoCofre de src/features/notes/markdown.ts
// (que não roda no Deno por importar js-yaml).
const PROIBIDOS = /[*"\\/<>:|?#^[\]]/g;
const PASTA_PADRAO = "Porceli";
function tituloParaArquivo(titulo: string): string {
  const limpo = titulo.replace(PROIBIDOS, "").replace(/\s+/g, " ").trim();
  return (limpo.replace(/\.+$/, "") || "Sem título").slice(0, 120);
}
function caminhoNoCofre(n: { title: string; folder: string }): string {
  const pasta = n.folder.split("/").map((p) => p.replace(PROIBIDOS, "").trim()).filter(Boolean).join("/");
  const arquivo = `${tituloParaArquivo(n.title)}.md`;
  return pasta ? `${pasta}/${arquivo}` : arquivo;
}

async function sincronizar(noteId: string, renamedFrom: string | null) {
  try {
    const r = await invocar("notes-sync", { noteId, renamedFrom });
    return r?.ok === false ? `sincronização falhou: ${r.error ?? "erro"}` : `sincronizada no cofre${r?.path ? `: ${r.path}` : ""}`;
  } catch (e) {
    return `sincronização falhou: ${(e as Error).message}`;
  }
}

async function criarNota(a: { titulo?: string; corpo?: string; pasta?: string; tags?: string[]; cliente_id?: string; lead_id?: string; sincronizar?: boolean }) {
  const { id: userId } = await dono();
  const title = a.titulo?.trim() || "Sem título";
  const folder = a.pasta ?? PASTA_PADRAO;
  const { data, error } = await db.from("notes").insert({
    user_id: userId, title, body: a.corpo ?? "", folder, tags: a.tags ?? [],
    client_id: a.cliente_id ?? null, lead_id: a.lead_id ?? null, vault_path: caminhoNoCofre({ title, folder }),
  }).select("id").single();
  if (error) throw new Error(error.message);
  const passos = ["nota criada"];
  if (a.sincronizar ?? true) passos.push(await sincronizar(data.id, null));
  return { nota_id: data.id, passos };
}

async function editarNota(a: { nota_id: string; titulo?: string; corpo?: string; pasta?: string; tags?: string[]; cliente_id?: string; lead_id?: string; sincronizar?: boolean }) {
  const { data: atual } = await db.from("notes").select("*").eq("id", exigir(a.nota_id, "nota_id é obrigatório")).single();
  if (!atual) throw new Error("Nota não encontrada");
  const title = a.titulo?.trim() || atual.title;
  const folder = a.pasta ?? atual.folder;
  const novoCaminho = caminhoNoCofre({ title, folder });
  // Renomear/mover: o sync precisa do caminho antigo para apagar o arquivo velho.
  const renamedFrom = atual.vault_path && atual.vault_path !== novoCaminho ? atual.vault_path : null;
  const { error } = await db.from("notes").update({
    title, body: a.corpo ?? atual.body, folder, tags: a.tags ?? atual.tags,
    client_id: a.cliente_id ?? atual.client_id ?? null, lead_id: a.lead_id ?? atual.lead_id ?? null,
    vault_path: novoCaminho, updated_at: new Date().toISOString(),
  }).eq("id", atual.id);
  if (error) throw new Error(error.message);
  const passos = ["nota atualizada"];
  if (a.sincronizar ?? true) passos.push(await sincronizar(atual.id, renamedFrom));
  return { nota_id: atual.id, passos };
}

async function excluirNota(a: { nota_id: string }) {
  const { error } = await db.from("notes").delete().eq("id", exigir(a.nota_id, "nota_id é obrigatório"));
  if (error) throw new Error(error.message);
  return { passos: ["nota excluída"] };
}

const camposNota = {
  titulo: { type: "string" }, corpo: { type: "string", description: "Markdown." },
  pasta: { type: "string", description: "Pasta no cofre, ex.: 'Clientes/Acme'. Padrão: Porceli." },
  tags: { type: "array", items: { type: "string" } }, cliente_id: { type: "string" }, lead_id: { type: "string" },
  sincronizar: { type: "boolean", description: "Espelhar no cofre (GitHub). Padrão true." },
};

export const NOTAS: Record<string, Ferramenta> = {
  criar_nota: { description: "Cria uma nota (com caminho no cofre) e espelha no GitHub.", inputSchema: parametros(camposNota), executar: criarNota },
  editar_nota: {
    description: "Edita uma nota; renomear ou mudar de pasta move o arquivo no cofre.",
    inputSchema: parametros({ nota_id: { type: "string" }, ...camposNota }, ["nota_id"]), executar: editarNota,
  },
  excluir_nota: { description: "Exclui uma nota do sistema.", inputSchema: parametros({ nota_id: { type: "string" } }, ["nota_id"]), executar: excluirNota },
};
