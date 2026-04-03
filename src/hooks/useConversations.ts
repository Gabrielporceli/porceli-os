import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: string;
  user_id: string;
  phone: string;
  remote_jid?: string;
  contact_name?: string;
  last_message?: string;
  stage?: string;
  tag?: string;
  direction?: string;
  unread_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  text: string;
  numero?: string;
  mensagem?: string;
  direcao?: boolean;
  data_hora?: string;
  nome_contato?: string;
  created_at?: string;
  updated_at?: string;
  media_type?: string;
  media_url?: string;
  media_filename?: string;
  media_size?: number;
}

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      return data as Conversation[];
    },
  });
};

export const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId);

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      // Ordenar mensagens usando prioritariamente data_hora (do banco) e depois created_at
      const sortedData = (data as Message[]).sort((a, b) => {
        // Usar data_hora preferencialmente (campo do banco com timestamp correto em UTC)
        const timestampA = new Date(a.data_hora || a.created_at || '1970-01-01T00:00:00Z');
        const timestampB = new Date(b.data_hora || b.created_at || '1970-01-01T00:00:00Z');
        
        // Ordenar do mais antigo para o mais recente (cronológica)
        return timestampA.getTime() - timestampB.getTime();
      });

      return sortedData;
    },
    enabled: !!conversationId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          text,
          numero: "user", // Usar "user" para indicar que é mensagem do usuário
          mensagem: text,
          direcao: true,
          data_hora: new Date().toISOString(), // Salvar em UTC automaticamente
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar a última mensagem da conversa
      await supabase
        .from("conversations")
        .update({
          last_message: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Ocorreu um erro ao enviar a mensagem",
        variant: "destructive",
      });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ phone, contactName }: { phone: string; contactName: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userData.user.id,
          phone,
          contact_name: contactName,
          last_message: "Conversa iniciada",
          stage: "Sem atendimento",
          tag: "Lead",
          direction: "outbound",
          unread_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Conversa criada",
        description: "Nova conversa criada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erro ao criar conversa",
        description: "Ocorreu um erro ao criar a conversa",
        variant: "destructive",
      });
    },
  });
};
