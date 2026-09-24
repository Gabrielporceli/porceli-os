/**
 * CRUD dos quadros, no padrão de useNotes/useFunnelMaps: estado local +
 * Supabase, escopo por RLS.
 *
 * `salvarGrafo` é separado de `atualizar` porque o canvas dispara a cada
 * arrastar de nó. Ele grava só `nodes`/`edges` e NÃO mexe no estado local —
 * o React Flow já é dono da posição naquele momento, e reescrever o estado
 * a cada gravação faria o nó pular de volta no meio do arrasto.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ArestaQuadro, NoQuadro, Quadro, TipoQuadro } from "./types";

interface LinhaQuadro {
  id: string;
  title: string;
  kind: string;
  folder: string;
  nodes: unknown;
  edges: unknown;
  created_at: string;
  updated_at: string;
}

function linhaParaQuadro(r: LinhaQuadro): Quadro {
  return {
    id: r.id,
    title: r.title,
    kind: (r.kind === "fluxo" ? "fluxo" : "mapa") as TipoQuadro,
    folder: r.folder ?? "",
    nodes: Array.isArray(r.nodes) ? (r.nodes as NoQuadro[]) : [],
    edges: Array.isArray(r.edges) ? (r.edges as ArestaQuadro[]) : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Nó inicial de cada tipo, pra ninguém cair num canvas em branco. */
function grafoInicial(kind: TipoQuadro, titulo: string): { nodes: NoQuadro[]; edges: ArestaQuadro[] } {
  if (kind === "mapa") {
    return {
      nodes: [
        {
          id: crypto.randomUUID(),
          type: "quadroNo",
          position: { x: 0, y: 0 },
          data: { texto: titulo, papel: "central", cor: 0 },
        },
      ],
      edges: [],
    };
  }
  const inicio: NoQuadro = {
    id: crypto.randomUUID(),
    type: "quadroNo",
    position: { x: 0, y: 0 },
    data: { texto: "Início", papel: "inicio", cor: 2 },
  };
  return { nodes: [inicio], edges: [] };
}

export function useBoards() {
  const [boards, setBoards] = useState<Quadro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("note_boards")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar quadros:", error);
      toast.error("Não foi possível carregar os quadros");
      setIsLoading(false);
      return;
    }
    setBoards(((data ?? []) as unknown as LinhaQuadro[]).map(linhaParaQuadro));
    setIsLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const criar = useCallback(
    async (kind: TipoQuadro, folder = "") => {
      const { data: sessao } = await supabase.auth.getUser();
      const userId = sessao?.user?.id;
      if (!userId) throw new Error("sem sessão");

      const title = kind === "mapa" ? "Novo mapa mental" : "Novo fluxograma";
      const grafo = grafoInicial(kind, title);
      const { data, error } = await supabase
        .from("note_boards")
        .insert({ user_id: userId, title, kind, folder, ...grafo } as never)
        .select()
        .single();
      if (error) throw error;
      const novo = linhaParaQuadro(data as unknown as LinhaQuadro);
      setBoards((atual) => [novo, ...atual]);
      return novo;
    },
    []
  );

  const atualizar = useCallback(
    async (id: string, patch: Partial<Pick<Quadro, "title" | "folder">>) => {
      const agora = new Date().toISOString();
      setBoards((atual) => atual.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: agora } : b)));
      const { error } = await supabase
        .from("note_boards")
        .update({ ...patch, updated_at: agora } as never)
        .eq("id", id);
      if (error) throw error;
    },
    []
  );

  /** Grava só o grafo. Ver a nota no topo sobre não tocar o estado local. */
  const salvarGrafo = useCallback(
    async (id: string, nodes: NoQuadro[], edges: ArestaQuadro[]) => {
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("note_boards")
        .update({ nodes, edges, updated_at: agora } as never)
        .eq("id", id);
      if (error) throw error;
      // Só os metadados no estado local; `nodes`/`edges` seguem com o canvas.
      setBoards((atual) =>
        atual.map((b) => (b.id === id ? { ...b, nodes, edges, updatedAt: agora } : b))
      );
    },
    []
  );

  const remover = useCallback(async (id: string) => {
    const { error } = await supabase.from("note_boards").delete().eq("id", id);
    if (error) throw error;
    setBoards((atual) => atual.filter((b) => b.id !== id));
  }, []);

  return { boards, isLoading, criar, atualizar, salvarGrafo, remover, recarregar: carregar };
}
