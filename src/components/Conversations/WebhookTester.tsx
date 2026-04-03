
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube, Zap, CheckCircle, Globe } from "lucide-react";
import { useTestWebhook, useTestWebhookEdgeFunction } from "@/hooks/useWebhookMessages";

export function WebhookTester() {
  const testWebhook = useTestWebhook();
  const testWebhookEdge = useTestWebhookEdgeFunction();

  const handleDirectTest = () => {
    testWebhook.mutate();
  };

  const handleEdgeFunctionTest = () => {
    // Simular uma mensagem recebida do WhatsApp com timestamp correto
    const testData = {
      p_numero: "5511999999999",
      p_mensagem: `Teste de timestamp - ${new Date().toLocaleString('pt-BR')}`,
      p_direcao: false,
      p_data_hora: new Date().toISOString(), // Timestamp em UTC
      p_nome_contato: "Teste Webhook",
      p_user_id: "bad3abae-951e-49a4-8738-9037661fd5a1" // Seu user_id
    };
    
    console.log('Enviando dados de teste com timestamp:', testData);
    testWebhookEdge.mutate(testData);
  };

  return (
    <Card className="bg-goat-gray-800 border-goat-gray-700 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-goat-purple rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Webhook Tester</h3>
          <p className="text-goat-gray-400 text-sm">Teste o processamento automático de mensagens</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sistema Ativo
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Zap className="w-3 h-3 mr-1" />
            Webhook Configurado
          </Badge>
        </div>

        <p className="text-goat-gray-300 text-sm">
          O sistema processa mensagens automaticamente criando contatos e conversas quando necessário. 
          Teste os dois métodos disponíveis:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={handleDirectTest}
            disabled={testWebhook.isPending}
            className="btn-primary"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {testWebhook.isPending ? "Testando..." : "Teste Direto"}
          </Button>

          <Button 
            onClick={handleEdgeFunctionTest}
            disabled={testWebhookEdge.isPending}
            className="btn-secondary"
          >
            <Globe className="w-4 h-4 mr-2" />
            {testWebhookEdge.isPending ? "Testando..." : "Teste Edge Function"}
          </Button>
        </div>

        {testWebhook.isSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">✅ Teste direto realizado com sucesso! Verifique a lista de conversas.</p>
          </div>
        )}

        {testWebhookEdge.isSuccess && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">✅ Teste da Edge Function realizado com sucesso! Verifique a lista de conversas.</p>
          </div>
        )}

        {testWebhook.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">❌ Erro no teste direto: {testWebhook.error?.message}</p>
          </div>
        )}

        {testWebhookEdge.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">❌ Erro no teste da Edge Function: {testWebhookEdge.error?.message}</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-goat-gray-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Como funciona:</h4>
          <ul className="text-xs text-goat-gray-400 space-y-1">
            <li>• <strong>Teste Direto:</strong> Usa a função SQL process_webhook_message</li>
            <li>• <strong>Teste Edge Function:</strong> Simula webhook via Edge Function</li>
            <li>• Cria contatos automaticamente se não existirem</li>
            <li>• Cria conversas automaticamente se não existirem</li>
            <li>• Vincula mensagens aos contatos e conversas corretos</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
