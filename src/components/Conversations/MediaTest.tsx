import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const MediaTest: React.FC = () => {
  const { toast } = useToast();

  const testMediaProcessing = async () => {
    try {
      toast({ title: "Enviando teste de mídia..." });
      
      const testData = {
        p_user_id: "bad3abae-951e-49a4-8738-9037661fd5a1",
        p_numero: "5511999999999",
        p_mensagem: "Teste de imagem",
        p_direcao: false,
        p_nome_contato: "Teste Mídia",
        p_media_type: "imageMessage",
        p_media_url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/45678901_123456789012345678_1234567890123456789_n.enc?ccb=11-4&oh=abc123&oe=DEF456&_nc_sid=5e03e0&mms3=true",
        p_media_key: "dGVzdGVfa2V5X2Jhc2U2NA==", // "teste_key_base64" em base64
        p_media_filename: "teste_imagem.jpg",
        p_media_size: 51200
      };

      const { data, error } = await supabase.functions.invoke('webhook-messages', {
        body: testData
      });

      if (error) throw error;

      toast({ 
        title: "Sucesso!", 
        description: "Teste de mídia processado com ID: " + data?.message_id,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Erro no teste de mídia:', error);
      toast({ 
        title: "Erro no teste", 
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 bg-goat-gray-800 rounded-lg border border-goat-gray-700 mb-4">
      <h3 className="text-white font-semibold mb-2">Teste de Mídia</h3>
      <p className="text-goat-gray-400 text-sm mb-3">
        Testar o processamento de mídia do WhatsApp
      </p>
      <Button onClick={testMediaProcessing} className="btn-primary">
        🧪 Testar Mídia
      </Button>
    </div>
  );
};