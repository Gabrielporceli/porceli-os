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

    const { user_id, numero, mensagem, nome_contato, media_base64, media_mimetype, media_filename } = await req.json()

    console.log('Enviando mensagem:', { user_id, numero, mensagem: mensagem || '[mídia]', media_mimetype })

    // Validar dados obrigatórios
    if (!user_id || !numero || (!mensagem && !media_base64)) {
      throw new Error('Dados obrigatórios ausentes: user_id, numero e mensagem ou mídia')
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
      const displayText = mensagem || (media_mimetype?.startsWith('audio/') ? '🎤 Áudio' : media_filename || '📎 Arquivo')
      const { error: updateError } = await supabaseClient
        .from('conversations')
        .update({
          last_message: displayText,
          contact_name,
          updated_at: data_hora
        })
        .eq('id', conversation.id)

      if (updateError) {
        console.error('Erro ao atualizar conversa:', updateError)
        throw updateError
      }
    }

    // PASSO 2: Upload de mídia para o Supabase Storage (se houver)
    let stored_media_url: string | null = null

    if (media_base64) {
      try {
        const base64Clean = media_base64.includes(',') ? media_base64.split(',')[1] : media_base64
        const binaryStr = atob(base64Clean)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

        const ext = media_filename?.split('.').pop() || (media_mimetype?.split('/')[1]) || 'bin'
        const storagePath = `${user_id}/${Date.now()}_${media_filename || `media.${ext}`}`

        // Garantir que o bucket existe
        await supabaseClient.storage.createBucket('messages-media', { public: true }).catch(() => {})

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('messages-media')
          .upload(storagePath, bytes, { contentType: media_mimetype || 'application/octet-stream', upsert: false })

        if (uploadError) {
          console.error('Erro no upload de mídia:', uploadError)
        } else if (uploadData) {
          const { data: { publicUrl } } = supabaseClient.storage.from('messages-media').getPublicUrl(uploadData.path)
          stored_media_url = publicUrl
          console.log('✅ Mídia salva:', stored_media_url)
        }
      } catch (uploadErr) {
        console.error('Falha no upload de mídia (não crítico):', uploadErr)
      }
    }

    // PASSO 3: Inserir mensagem como SENT
    const messageText = mensagem || (media_mimetype?.startsWith('audio/') ? 'Mensagem de voz' : 'Mídia enviada')
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        text: messageText,
        numero,
        mensagem: messageText,
        direcao: true,
        data_hora,
        nome_contato,
        media_type: media_mimetype || null,
        media_filename: media_filename || null,
        media_url: stored_media_url,
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

    // PASSO 4: Enviar mensagem DIRETAMENTE via Evolution API
    const evolutionUrl = (Deno.env.get('EVOLUTION_URL') || 'https://api.gabrielporceli.com.br').trim()
    const evolutionApiKey = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
    const evolutionInstance = "agencia03"

    // Limpeza do número: apenas dígitos
    let target_number = numero.split('@')[0].replace(/[^0-9]/g, '')
    if (target_number.startsWith('00')) target_number = target_number.substring(2)

    // Garantir código do país brasileiro (55) se o número não tiver
    // Números BR: 10 dígitos (sem 9) ou 11 dígitos (com 9), ex: 65981099630
    if (target_number.length <= 11 && !target_number.startsWith('55')) {
      target_number = '55' + target_number
    }

    console.log(`📤 Enviando via Evolution API: ${evolutionInstance} para ${target_number}`)

    let evolutionEndpoint: string
    let evolutionBody: object

    if (media_base64) {
      // Remover prefixo data URL se presente
      const base64Clean = media_base64.includes(',') ? media_base64.split(',')[1] : media_base64

      if (media_mimetype?.startsWith('audio/')) {
        // Áudio como PTT (Push-to-Talk)
        evolutionEndpoint = `${evolutionUrl}/message/sendWhatsAppAudio/${evolutionInstance}`
        evolutionBody = { number: target_number, audio: base64Clean, encoding: true }
      } else {
        // Imagem, vídeo ou documento
        const mediatype = media_mimetype?.startsWith('image/') ? 'image'
          : media_mimetype?.startsWith('video/') ? 'video'
          : 'document'

        evolutionEndpoint = `${evolutionUrl}/message/sendMedia/${evolutionInstance}`
        evolutionBody = {
          number: target_number,
          mediatype,
          mimetype: media_mimetype,
          media: base64Clean,
          fileName: media_filename || 'arquivo',
          caption: mensagem || undefined,
          delay: 1200
        }
      }
    } else {
      // Texto puro
      evolutionEndpoint = `${evolutionUrl}/message/sendText/${evolutionInstance}`
      evolutionBody = { number: target_number, text: mensagem, delay: 1200 }
    }

    console.log(`📤 Endpoint: ${evolutionEndpoint}`)
    console.log(`📤 Body keys: ${Object.keys(evolutionBody).join(', ')}`)

    const evolutionResponse = await fetch(evolutionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify(evolutionBody)
    })

    const rawText = await evolutionResponse.text()
    console.log(`📥 Evolution status: ${evolutionResponse.status}`)
    console.log(`📥 Evolution response: ${rawText.substring(0, 500)}`)

    let evolutionResult
    try {
      evolutionResult = JSON.parse(rawText)
    } catch (e) {
      evolutionResult = { message: rawText }
    }

    if (!evolutionResponse.ok) {
      console.error('❌ Erro na Evolution API:', evolutionResponse.status, rawText.substring(0, 300))
      return new Response(
        JSON.stringify({
          success: false,
          error: evolutionResult?.message || rawText || 'Erro na Evolution API',
          status: evolutionResponse.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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