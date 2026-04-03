
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WebhookMessage {
  p_numero: string;
  p_mensagem: string;
  p_direcao: boolean;
  p_data_hora: string;
  p_nome_contato?: string;
  p_user_id: string;
  p_media_type?: string;
  p_media_url?: string;
  p_media_filename?: string;
  p_media_size?: number;
  p_media_key?: string; // Chave para descriptografia
}

export const useProcessWebhookMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (webhookData: WebhookMessage) => {
      console.log('Processando mensagem webhook no frontend:', webhookData);

      // @ts-ignore - types will be updated after migration
      const { data, error } = await supabase.rpc('process_webhook_message', {
        p_user_id: webhookData.p_user_id,
        p_numero: webhookData.p_numero,
        p_mensagem: webhookData.p_mensagem,
        p_direcao: webhookData.p_direcao,
        p_data_hora: webhookData.p_data_hora,
        p_nome_contato: webhookData.p_nome_contato,
        p_media_type: webhookData.p_media_type,
        p_media_url: webhookData.p_media_url,
        p_media_filename: webhookData.p_media_filename,
        p_media_size: webhookData.p_media_size
      });

      if (error) {
        console.error('Erro ao processar mensagem webhook:', error);
        throw error;
      }

      console.log('Mensagem webhook processada com sucesso:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Mensagem webhook processada com sucesso:', data);
      
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      
      toast({
        title: "Mensagem processada",
        description: "Nova mensagem recebida e processada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao processar mensagem webhook:", error);
      toast({
        title: "Erro ao processar mensagem",
        description: "Ocorreu um erro ao processar a mensagem recebida",
        variant: "destructive",
      });
    },
  });
};

export const useTestWebhook = () => {
  const processWebhook = useProcessWebhookMessage();

  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("Usuário não autenticado");
      }

      // Gerar um número único para o teste
      const testNumber = "5511" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      const testMessage: WebhookMessage = {
        p_numero: testNumber,
        p_mensagem: `Mensagem de teste recebida via webhook - ${new Date().toLocaleTimeString()}`,
        p_direcao: false, // mensagem recebida
        p_data_hora: new Date().toISOString(),
        p_nome_contato: "Contato Teste " + Math.floor(Math.random() * 1000),
        p_user_id: userData.user.id
      };

      console.log('Testando webhook com dados:', testMessage);
      return processWebhook.mutateAsync(testMessage);
    },
  });
};

// Hook para testar o webhook via edge function
export const useTestWebhookEdgeFunction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customData?: Partial<WebhookMessage>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("Usuário não autenticado");
      }

      const testNumber = customData?.p_numero || "5511" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      const testData = {
        p_numero: testNumber,
        p_mensagem: customData?.p_mensagem || `Teste via Edge Function - ${new Date().toLocaleTimeString()}`,
        p_direcao: customData?.p_direcao ?? false,
        p_data_hora: customData?.p_data_hora || new Date().toISOString(),
        p_nome_contato: customData?.p_nome_contato || "Teste Edge Function",
        p_user_id: customData?.p_user_id || userData.user.id,
        p_media_type: customData?.p_media_type,
        p_media_url: customData?.p_media_url,
        p_media_filename: customData?.p_media_filename,
        p_media_size: customData?.p_media_size,
        p_media_key: customData?.p_media_key // Incluir chave de descriptografia se disponível
      };

      console.log('Testando webhook via Edge Function:', testData);

      const { data, error } = await supabase.functions.invoke('webhook-messages', {
        body: { data: testData }
      });

      if (error) {
        console.error('Erro ao chamar Edge Function:', error);
        throw error;
      }

      console.log('Resposta da Edge Function:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Edge Function executada com sucesso:', data);
      
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      
      toast({
        title: "Teste realizado",
        description: "Edge Function executada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao testar Edge Function:", error);
      toast({
        title: "Erro no teste",
        description: `Erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hook para testar upload de imagem
export const useTestImageUpload = () => {
  const testWebhook = useTestWebhookEdgeFunction();

  return useMutation({
    mutationFn: async () => {
      // Simular dados de uma imagem recebida do WhatsApp
      const testImageData: Partial<WebhookMessage> = {
        p_mensagem: "", // Mensagem vazia para mídia
        p_media_type: "image/jpeg",
        p_media_url: "https://example.com/encrypted-image.jpg", // URL de exemplo
        p_media_filename: "imagem_teste.jpg",
        p_media_size: 1024000, // 1MB
        p_media_key: "dGVzdGVfa2V5X3BhcmFfZGVzY3JpcHRvZ3JhZmlh", // Chave base64 de exemplo
        p_nome_contato: "Teste de Imagem"
      };

      return testWebhook.mutateAsync(testImageData);
    },
  });
};
