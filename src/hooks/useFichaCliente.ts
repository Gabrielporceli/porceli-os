import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { limparRespostas } from "@/features/clients/fichaCampos";

/** Ficha do cliente (tabela `client_fichas`, ainda fora dos tipos gerados). */
export type FichaCliente = Record<string, string | number | null> & {
  id: string;
  client_id: string;
  cpl_maximo: number | null;
  preenchido_por: "agencia" | "cliente" | null;
  respondido_cliente_em: string | null;
  link_token: string | null;
  link_expira_em: string | null;
  updated_at: string;
};

const chave = (clientId: string) => ["ficha-cliente", clientId];

export function useFichaCliente(clientId: string | undefined) {
  return useQuery({
    queryKey: chave(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("client_fichas" as never).select("*")
        .eq("client_id", clientId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as FichaCliente | null;
    },
  });
}

/** Salva as respostas (pela agência). Cria a ficha na primeira vez. */
export function useSalvarFicha(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (respostas: Record<string, unknown>) => {
      const { error } = await supabase.from("client_fichas" as never)
        .upsert({ client_id: clientId, ...limparRespostas(respostas), preenchido_por: "agencia" } as never,
          { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clientId) }),
  });
}

/** Link único para o dono do negócio responder, válido por 30 dias. */
export function useGerarLinkFicha(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const expira = new Date(Date.now() + 30 * 86_400_000).toISOString();
      const { error } = await supabase.from("client_fichas" as never)
        .upsert({ client_id: clientId, link_token: token, link_expira_em: expira } as never, { onConflict: "client_id" });
      if (error) throw error;
      return `${window.location.origin}/ficha/${token}`;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clientId) }),
  });
}
