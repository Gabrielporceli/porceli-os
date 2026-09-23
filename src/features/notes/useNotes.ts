/**
 * CRUD das notas, no padrão dos outros hooks do CRM (useFunnelMaps,
 * useClients): estado local + Supabase, escopo por RLS.
 *
 * O `vault_path` é gravado no MESMO update em que título ou pasta mudam, e o
 * caminho ANTIGO volta em `renamedFrom` — é o que permite a sincronização
 * apagar o arquivo antigo do repositório em vez de deixar órfão no cofre.
 * Recalcular o caminho na hora de sincronizar não resolveria: nesse momento
 * o título antigo já se perdeu.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// `sonner`, e nao o useToast do shadcn: o <Toaster/> do shadcn nao esta
// montado no App.tsx, entao aqueles toasts sao engolidos em silencio.
import { toast } from "sonner";
import { caminhoNoCofre, type Note } from "./markdown";

interface NoteRow {
  id: string;
  title: string;
  body: string;
  folder: string;
  tags: string[];
  client_id: string | null;
  lead_id: string | null;
  extra_frontmatter: unknown;
  vault_path: string | null;
  git_sha: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteComEstado extends Note {
  vaultPath: string | null;
  syncedAt: string | null;
  /** true quando houve edição depois da última sincronização. */
  pendente: boolean;
}

function linhaParaNota(r: NoteRow): NoteComEstado {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    folder: r.folder,
    tags: r.tags ?? [],
    clientId: r.client_id,
    leadId: r.lead_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    extraFrontmatter:
      r.extra_frontmatter && typeof r.extra_frontmatter === "object"
        ? (r.extra_frontmatter as Record<string, unknown>)
        : undefined,
    vaultPath: r.vault_path,
    syncedAt: r.synced_at,
    pendente: !r.synced_at || new Date(r.updated_at) > new Date(r.synced_at),
  };
}

export type NovaNota = Partial<Pick<Note, "title" | "body" | "folder" | "tags" | "clientId" | "leadId">>;

export function useNotes() {
  const [notes, setNotes] = useState<NoteComEstado[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setNotes((data ?? []).map((d) => linhaParaNota(d as NoteRow)));
    } catch (e) {
      console.error("Erro ao carregar notas:", e);
      toast.error("Não foi possível carregar as notas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = useCallback(
    async (nova: NovaNota = {}): Promise<NoteComEstado> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const titulo = nova.title?.trim() || "Sem título";
      const pasta = nova.folder ?? "";

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: titulo,
          body: nova.body ?? "",
          folder: pasta,
          tags: nova.tags ?? [],
          client_id: nova.clientId ?? null,
          lead_id: nova.leadId ?? null,
          vault_path: caminhoNoCofre({ title: titulo, folder: pasta }),
        })
        .select()
        .single();
      if (error) throw error;

      const nota = linhaParaNota(data as NoteRow);
      setNotes((prev) => [nota, ...prev]);
      return nota;
    },
    []
  );

  const atualizar = useCallback(
    async (id: string, patch: NovaNota): Promise<{ nota: NoteComEstado; renamedFrom: string | null }> => {
      const atual = notes.find((n) => n.id === id);
      if (!atual) throw new Error("Nota não encontrada");

      const titulo = patch.title?.trim() || atual.title;
      const pasta = patch.folder ?? atual.folder;
      const novoCaminho = caminhoNoCofre({ title: titulo, folder: pasta });
      // Só conta como renomeação se já havia arquivo no cofre e ele mudou.
      const renamedFrom =
        atual.vaultPath && atual.vaultPath !== novoCaminho ? atual.vaultPath : null;

      const { data, error } = await supabase
        .from("notes")
        .update({
          title: titulo,
          body: patch.body ?? atual.body,
          folder: pasta,
          tags: patch.tags ?? atual.tags,
          client_id: patch.clientId ?? atual.clientId ?? null,
          lead_id: patch.leadId ?? atual.leadId ?? null,
          vault_path: novoCaminho,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const nota = linhaParaNota(data as NoteRow);
      setNotes((prev) => prev.map((n) => (n.id === id ? nota : n)));
      return { nota, renamedFrom };
    },
    [notes]
  );

  const remover = useCallback(async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /** Pastas existentes, derivadas dos caminhos — não há tabela de pastas. */
  const pastas = Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))).sort();
  const etiquetas = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  return { notes, pastas, etiquetas, isLoading, criar, atualizar, remover, recarregar: carregar };
}
