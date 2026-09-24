/**
 * A pauta de conteúdo: os ganchos que vão virar post.
 *
 * Vivia dentro da nota `Ideias de Conteúdo`, como lista de tarefas com os
 * campos em sintaxe do Dataview (`[cat:: Tráfego Pago]`) e uma consulta que
 * montava a tabela. Dataview é plugin do Obsidian — sem ele aquilo era um
 * bloco de código morto. E 36 ganchos com categoria, formato, referência e
 * feito/não feito são uma tabela, não um texto.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ideia {
  id: string;
  gancho: string;
  categoria: string;
  formato: string;
  referencia: string;
  observacao: string;
  feito: boolean;
  ordem: number;
}

interface Linha extends Ideia {
  user_id: string;
  created_at: string;
  updated_at: string;
}

/** Espaço entre as ordens pra inserir no meio sem reescrever a tabela. */
const PASSO = 10;

export function usePauta() {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("content_ideas")
      .select("*")
      .order("feito", { ascending: true })
      .order("ordem", { ascending: true });
    if (error) {
      console.error("Erro ao carregar a pauta:", error);
      toast.error("Não foi possível carregar a pauta");
      setIsLoading(false);
      return;
    }
    setIdeias(((data ?? []) as unknown as Linha[]).map((l) => ({
      id: l.id, gancho: l.gancho, categoria: l.categoria, formato: l.formato,
      referencia: l.referencia, observacao: l.observacao, feito: l.feito, ordem: l.ordem,
    })));
    setIsLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const criar = useCallback(async (parcial: Partial<Ideia> = {}) => {
    const { data: sessao } = await supabase.auth.getUser();
    const userId = sessao?.user?.id;
    if (!userId) throw new Error("sem sessão");
    // Nasce no topo: ideia nova é a que você acabou de ter.
    const menor = Math.min(0, ...ideias.map((i) => i.ordem));
    const { data, error } = await supabase
      .from("content_ideas")
      .insert({
        user_id: userId,
        gancho: parcial.gancho ?? "",
        categoria: parcial.categoria ?? "",
        formato: parcial.formato ?? "",
        referencia: parcial.referencia ?? "",
        observacao: parcial.observacao ?? "",
        ordem: menor - PASSO,
      } as never)
      .select()
      .single();
    if (error) throw error;
    const nova = data as unknown as Linha;
    setIdeias((a) => [{ ...nova }, ...a]);
    return nova.id;
  }, [ideias]);

  const atualizar = useCallback(async (id: string, patch: Partial<Ideia>) => {
    // Otimista: a tabela é de edição rápida e esperar o banco a cada tecla
    // deixaria o campo travando.
    setIdeias((a) => a.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase
      .from("content_ideas")
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) {
      console.error("Erro ao salvar a ideia:", error);
      toast.error("Não foi possível salvar");
      void carregar();
    }
  }, [carregar]);

  const remover = useCallback(async (id: string) => {
    const antes = ideias;
    setIdeias((a) => a.filter((i) => i.id !== id));
    const { error } = await supabase.from("content_ideas").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir");
      setIdeias(antes);
    }
  }, [ideias]);

  return { ideias, isLoading, criar, atualizar, remover, recarregar: carregar };
}
