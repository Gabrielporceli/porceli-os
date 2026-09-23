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
    if (error) {
      // O supabase-js devolve "Edge Function returned a non-2xx status code"
      // e esconde o corpo em `context`. Sem ler dali, a mensagem especifica
      // que a funcao montou ("GitHub 404: ...") se perde e o erro vira
      // inutil pra diagnosticar.
      let detalhe = error.message;
      const ctx = (error as { context?: unknown }).context;
      if (ctx instanceof Response) {
        try {
          const corpo = await ctx.clone().json();
          if (corpo?.error) detalhe = String(corpo.error);
        } catch {
          try { detalhe = (await ctx.clone().text()) || detalhe; } catch { /* mantem */ }
        }
      }
      return { ok: false, error: detalhe };
    }
    return (data ?? { ok: false, error: "resposta vazia" }) as ResultadoSync;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
