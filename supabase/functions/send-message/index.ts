import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, numero, mensagem, nome_contato } = await req.json()
    
    console.log('Enviando mensagem:', { user_id, numero, mensagem, nome_contato })

    // Validar dados obrigatórios
    if (!user_id || !numero || !mensagem) {
      throw new Error('Dados obrigatórios ausentes: user_id, numero, mensagem')
    }

    const phone_clean = numero.replace(/[^0-9+]/g, '')
    const data_hora = new Date().toISOString()
    const contact_name = nome_contato || `Contato ${phone_clean}`

    // PASSO 1: Buscar ou criar conversa
    let { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('user_id', user_id)
      .or(`phone.eq.${phone_clean},remote_jid.eq.${numero},numero.eq.${numero}`)
      .single()

    if (convError && convError.code !== 'PGRST116') {
      console.error('Erro ao buscar conversa:', convError)
      throw convError
    }

    if (!conversation) {
      // Criar nova conversa
      const { data: newConversation, error: createError } = await supabaseClient
        .from('conversations')
        .insert({
          user_id,
          phone: phone_clean,
          remote_jid: numero,
          numero: numero,
          contact_name,
          last_message: mensagem,
          stage: 'Sem atendimento',
          tag: 'Lead',
          direction: 'outbound',
          unread_count: 0,
          created_at: data_hora,
          updated_at: data_hora
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar conversa:', createError)
        throw createError
      }

      conversation = newConversation
      console.log('Nova conversa criada:', conversation.id)
    } else {
      // Atualizar conversa existente
      const { error: updateError } = await supabaseClient
        .from('conversations')
        .update({
          last_message: mensagem,
          contact_name,
          updated_at: data_hora
        })
        .eq('id', conversation.id)

      if (updateError) {
        console.error('Erro ao atualizar conversa:', updateError)
        throw updateError
      }
    }

    // PASSO 2: Inserir mensagem como SENT
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        text: mensagem,
        numero,
        mensagem,
        direcao: true, // true = mensagem enviada pelo usuário
        data_hora,
        nome_contato,
        created_at: data_hora,
        updated_at: data_hora
      })
      .select()
      .single()

    if (messageError) {
      console.error('Erro ao inserir mensagem:', messageError)
      throw messageError
    }

    console.log('Mensagem inserida:', message.id)

    // PASSO 3: Enviar mensagem DIRETAMENTE via Evolution API
    const evolutionUrl = (Deno.env.get('EVOLUTION_URL') || 'https://api.gabrielporceli.com.br').trim()
    const evolutionApiKey = (Deno.env.get('EVOLUTION_API_KEY') || '2C2B8ACDE0FB-44EA-BD01-59E39E4A9E76').trim()
    const evolutionInstance = (Deno.env.get('EVOLUTION_INSTANCE') || 'agencia02').trim()

    // Limpeza rigorosa do número: apenas dígitos, sem prefixos extras além do DDI
    let target_number = numero.split('@')[0].replace(/[^0-9]/g, '')
    
    // Se o número começar com 00, substituir por + ou apenas remover 00 se o DDI vier depois
    if (target_number.startsWith('00')) target_number = target_number.substring(2)

    console.log(`📤 Enviando via Evolution API: ${evolutionInstance} para ${target_number}`)

    const evolutionEndpoint = `${evolutionUrl}/message/sendText/${evolutionInstance}`
    
    const evolutionResponse = await fetch(evolutionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: target_number,
        text: mensagem,
        delay: 1200
      })
    })

    let evolutionResult
    try {
      evolutionResult = await evolutionResponse.json()
    } catch (e) {
      evolutionResult = { message: 'Erro ao analisar resposta da Evolution API', raw: await evolutionResponse.text() }
    }

    if (!evolutionResponse.ok) {
      console.error('❌ Erro na Evolution API:', {
        status: evolutionResponse.status,
        statusText: evolutionResponse.statusText,
        result: evolutionResult,
        endpoint: evolutionEndpoint
      })
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: evolutionResult.message || 'Erro na Evolution API',
          details: evolutionResult,
          status: evolutionResponse.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('✅ Mensagem enviada com sucesso pela Evolution')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: message.id,
        conversation_id: conversation.id,
        evolution_result: evolutionResult,
        processed_at: data_hora
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao enviar mensagem:', err)
    
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Unknown error',
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})