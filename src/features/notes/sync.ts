/**
 * Disparo da sincronização com o cofre.
 *
 * Só chama a Edge Function — o token do GitHub vive lá, nunca aqui. Ver
 * supabase/functions/notes-sync/index.ts e docs/NOTAS-OBSIDIAN.md.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ResultadoSync {
  ok: boolean;
  path?: string;
  error?: string;
}

/**
 * Nunca lança: a sincronização é acessória: falhar não pode derrubar a
 * edição da nota, que já está salva no banco. Quem chama decide como
 * mostrar o erro.
 */
export async function sincronizarNota(
  noteId: string,
  renamedFrom?: string | null
): Promise<ResultadoSync> {
  try {
    const { data, error } = await supabase.functions.invoke("notes-sync", {
      body: { noteId, renamedFrom: renamedFrom ?? null },
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: "resposta vazia" }) as ResultadoSync;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Configuração da ponte, para a tela saber se há o que sincronizar. */
export async function lerConfigSync() {
  const { data } = await supabase
    .from("notes_sync_config")
    .select("repo, branch, base_path, enabled, last_sync_at, last_error")
    .maybeSingle();
  return data ?? null;
}
