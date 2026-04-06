import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendMessageData {
  numero: string;
  mensagem: string;
  nome_contato?: string;
  media_base64?: string;
  media_mimetype?: string;
  media_filename?: string;
}

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: result, error } = await supabase.functions.invoke('send-message', {
        body: {
          user_id: user.id,
          numero: data.numero,
          mensagem: data.mensagem,
          nome_contato: data.nome_contato,
          media_base64: data.media_base64,
          media_mimetype: data.media_mimetype,
          media_filename: data.media_filename,
        }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      
      toast.success("Mensagem enviada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem: " + (error.message || "Erro desconhecido"));
    }
  });
};