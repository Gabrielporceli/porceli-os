import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientData = await req.json();
    console.log('=== WEBHOOK CLIENT - INÍCIO ===');
    console.log('Dados recebidos do cliente:', JSON.stringify(clientData, null, 2));

    // Webhook URL
    const webhookUrl = 'https://webhook.gabrielporceli.com.br/webhook/recebedadosclientenovo';
    console.log('URL do webhook:', webhookUrl);

    // Preparar payload com dados do cliente
    const payload = {
      ...clientData,
      timestamp: new Date().toISOString(),
      event: 'client_created'
    };

    console.log('Payload a ser enviado:', JSON.stringify(payload, null, 2));

    // Enviar para o webhook com timeout
    console.log('Iniciando envio para o webhook...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('Status da resposta do webhook:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no webhook - Status:', response.status);
      console.error('Erro no webhook - Text:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Webhook failed: ${response.status} ${response.statusText}`,
          details: errorText,
          url: webhookUrl
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseData = await response.text();
    console.log('Resposta do webhook (sucesso):', responseData);
    console.log('=== WEBHOOK CLIENT - FIM (SUCESSO) ===');

    return new Response(
      JSON.stringify({ success: true, response: responseData, url: webhookUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('=== ERRO CRÍTICO NO WEBHOOK ===');
    console.error('Tipo do erro:', err.constructor?.name || 'Unknown');
    console.error('Mensagem do erro:', err.message || 'Unknown error');
    console.error('Stack trace:', err.stack || 'No stack trace');
    
    if (err.name === 'AbortError') {
      console.error('Timeout na requisição do webhook');
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro crítico: ${err.message || 'Unknown error'}`,
        errorType: err.constructor?.name || 'Unknown',
        url: 'https://webhook.gabrielporceli.com.br/webhook/recebedadosclientenovo'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});