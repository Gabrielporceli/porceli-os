
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Função para descriptografar mídia do WhatsApp
async function decryptWhatsAppMedia(encryptedData: ArrayBuffer, mediaKeyBase64: string, mediaType: string): Promise<Uint8Array> {
  const mediaKey = Uint8Array.from(atob(mediaKeyBase64), (c) => c.charCodeAt(0));

  // Definir a 'info' correta para o HKDF baseado no tipo de mídia
  let infoStr = 'WhatsApp Audio Keys';
  if (mediaType.startsWith('image')) infoStr = 'WhatsApp Image Keys';
  else if (mediaType.startsWith('video')) infoStr = 'WhatsApp Video Keys';
  else if (mediaType.startsWith('audio')) infoStr = 'WhatsApp Audio Keys';
  else if (mediaType.startsWith('application')) infoStr = 'WhatsApp Document Keys';

  const info = new TextEncoder().encode(infoStr);
  const salt = new Uint8Array(32);

  const hkdfKey = await crypto.subtle.importKey('raw', mediaKey, 'HKDF', false, ['deriveBits']);
  const expandedKey = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt,
    info
  }, hkdfKey, 112 * 8);

  const expandedKeyBytes = new Uint8Array(expandedKey);
  const iv = expandedKeyBytes.slice(0, 16);
  const cipherKey = expandedKeyBytes.slice(16, 48);

  const cryptoKey = await crypto.subtle.importKey('raw', cipherKey, {
    name: 'AES-CBC'
  }, false, ['decrypt']);

  // Para mídias do WhatsApp, cortar os últimos 10 bytes (MAC)
  const encryptedArray = new Uint8Array(encryptedData);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 10);

  // Descriptografar o payload
  const decryptedData = await crypto.subtle.decrypt({
    name: 'AES-CBC',
    iv
  }, cryptoKey, ciphertext.buffer);

  return new Uint8Array(decryptedData);
}

// Função para baixar e descriptografar mídia
async function downloadAndDecryptMedia(params: {
  mediaUrl: string;
  mediaKey: string;
  mediaType: string;
  filename: string;
  supabaseClient: any;
}) {
  const { mediaUrl, mediaKey, mediaType, filename, supabaseClient } = params;

  console.log('===> Tentando baixar mídia:', mediaUrl);

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'Origin': 'https://web.whatsapp.com',
        'Referer': 'https://web.whatsapp.com/',
        'User-Agent': 'WhatsApp/2.2332.15'
      }
    });

    console.log('===> Status HTTP:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const encryptedData = await response.arrayBuffer();
    const dataArr = new Uint8Array(encryptedData);

    console.log('===> Tamanho arquivo criptografado:', dataArr.length, 'bytes');
    console.log('===> Primeiros 16 bytes do arquivo:', Array.from(dataArr.slice(0, 16)));
    console.log('===> mediaKey base64:', mediaKey);

    const keyBytes = Uint8Array.from(atob(mediaKey), c => c.charCodeAt(0));
    console.log('===> Tamanho da mediaKey em bytes:', keyBytes.length);

    const decryptedData = await decryptWhatsAppMedia(encryptedData, mediaKey, mediaType);
    const decryptedArr = new Uint8Array(decryptedData);

    console.log('===> Tamanho arquivo descriptografado:', decryptedArr.length, 'bytes');
    console.log('===> Primeiros 16 bytes descriptografados:', Array.from(decryptedArr.slice(0, 16)));

    // Upload para o Supabase Storage
    const uniqueFilename = `${Date.now()}_${filename}${getFileExtension(mediaType)}`;
    const filePath = `media/${uniqueFilename}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('whatsapp-media')
      .upload(filePath, decryptedArr, { contentType: mediaType });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabaseClient.storage.from('whatsapp-media').getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      filename: uniqueFilename,
      size: decryptedArr.length
    };

  } catch (error: unknown) {
    const err = error as Error;
    console.error('===> ERRO DE DESCRIPTOGRAFIA:', err.message || 'Unknown error');
    return { success: false, error: 'Falha na descriptografia AES-CBC: ' + (err.message || 'Unknown error') };
  }
}

// Função para obter extensão do arquivo baseada no tipo MIME
function getFileExtension(mimeType: string): string {
  if (!mimeType) return '.bin';

  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/ogg; codecs=opus': '.ogg',
    'audio/mp4': '.m4a',
    'audio/amr': '.m4a',
    'video/mp4': '.mp4',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };

  // Limpar charset e outras diretivas extras do mimetype (ex: "audio/ogg; codecs=opus" -> "audio/ogg")
  // Mas vamos buscar no map primeiro caso tenha match exato
  if (extensions[mimeType]) {
    return extensions[mimeType];
  }

  const cleanMime = mimeType.split(';')[0].trim();
  return extensions[cleanMime] || '';
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION INICIADA - webhook-messages', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS OPTIONS - retornando ok');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestBody = await req.json();
    console.log('📦 Payload recebido:', JSON.stringify(requestBody, null, 2));

    // Normalização para Evolution API (Formato Nativo)
    if (requestBody.event && requestBody.data) {
      console.log('📱 Detectado formato nativo Evolution API:', requestBody.event);
      
      const data = requestBody.data;
      const message = data.message || {};
      const key = data.key || {};
      
      // Extrair o texto da mensagem baseado nos múltiplos tipos do WA
      let text = '';
      if (message.conversation) text = message.conversation;
      else if (message.extendedTextMessage?.text) text = message.extendedTextMessage.text;
      else if (message.imageMessage?.caption) text = message.imageMessage.caption;
      else if (message.videoMessage?.caption) text = message.videoMessage.caption;
      else if (message.documentWithCaptionMessage?.message?.documentMessage?.caption) text = message.documentWithCaptionMessage.message.documentMessage.caption;
      else if (message.buttonsResponseMessage?.selectedButtonId) text = message.buttonsResponseMessage.selectedButtonId;
      else if (message.templateButtonReplyMessage?.selectedId) text = message.templateButtonReplyMessage.selectedId;

      // Detectar tipo de mídia
      let mediaType = null;
      if (message.imageMessage) mediaType = 'imageMessage';
      else if (message.videoMessage) mediaType = 'videoMessage';
      else if (message.audioMessage) mediaType = 'audioMessage';
      else if (message.pttMessage) mediaType = 'pttMessage';
      else if (message.documentMessage) mediaType = 'documentMessage';

      // Ignorar IDs inválidos (Label/Metadata sem @)
      const remoteJid = key.remoteJid || null;
      if (!remoteJid || (!remoteJid.includes('@') && !/^\d+$/.test(remoteJid))) {
        console.log(`⏩ Ignorando webhook de ID inválido/metadata: ${remoteJid}`);
        return new Response(JSON.stringify({ success: true, message: 'Skipped metadata' }), { headers: corsHeaders });
      }

      // Identificar se é grupo
      const isGroup = remoteJid.endsWith('@g.us') || false;

      // 📸 Tentar capturar a foto de perfil se não vier no webhook
      let contactPhoto = data.profilePicUrl || null;
      if (!contactPhoto && !isGroup) {
        try {
          const evolutionUrl = (Deno.env.get('EVOLUTION_URL') || 'https://api.gabrielporceli.com.br').trim();
          const evolutionApiKey = "E42F543C93BB-4A59-B3A1-8AA2E506DC00";
          const evolutionInstance = "agencia03";

          console.log(`📸 Buscando foto de perfil para: ${remoteJid}`);
          // Buscar a foto via Evolution API (v2 recomenda POST para este endpoint)
          const photoResponse = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${evolutionInstance}`, {
            method: 'POST',
            headers: { 
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: remoteJid })
          });
          
          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            contactPhoto = photoData.profilePicUrl || photoData.url || null;
            console.log(contactPhoto ? `✅ Foto obtida: ${contactPhoto}` : `ℹ️ Contato sem foto pública.`);
          }
        } catch (photoErr) {
          console.warn('⚠️ Erro ao buscar foto de perfil:', photoErr);
        }
      }

      // Normalizar para o formato esperado pela função do banco
      requestBody = {
        p_numero: remoteJid, 
        p_is_group: isGroup,
        p_mensagem: text,
        p_direcao: key.fromMe || false,
        p_data_hora: data.messageTimestamp ? new Date(data.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
        p_nome_contato: data.pushName || null,
        p_user_id: Deno.env.get('DEFAULT_USER_ID') || 'bad3abae-951e-49a4-8738-9037661fd5a1',
        p_contact_photo: contactPhoto,
        
        // Dados de mídia para processamento posterior se existirem
        p_media_type: mediaType,
        p_media_url: mediaType ? message[mediaType]?.url || null : null,
        p_media_key: mediaType ? message[mediaType]?.mediaKey || null : null,
        p_media_mime: mediaType ? message[mediaType]?.mimetype || null : null,
        p_media_filename: mediaType ? message[mediaType]?.fileName || null : null,
        p_media_size: mediaType ? message[mediaType]?.fileLength || null : null
      };

      console.log('🔄 Payload normalizado:', JSON.stringify(requestBody, null, 2));
    }

    // Verificar dados obrigatórios
    if (!requestBody.p_numero || !requestBody.p_user_id) {
      throw new Error('Dados obrigatórios ausentes: p_numero, p_user_id');
    }

    // Processar timestamp
    let processedDateTime = requestBody.p_data_hora;
    if (!processedDateTime) {
      processedDateTime = new Date(Date.now() - 3 * 3600000).toISOString();
    } else {
      try {
        const date = new Date(processedDateTime);
        if (isNaN(date.getTime())) throw new Error('Data inválida');
        if (!processedDateTime.includes('T') || (!processedDateTime.includes('Z') && !/[+-]/.test(processedDateTime))) {
          processedDateTime = new Date(`${processedDateTime} GMT-0300`).toISOString();
        } else {
          processedDateTime = date.toISOString();
        }
      } catch {
        processedDateTime = new Date(Date.now() - 3 * 3600000).toISOString();
      }
    }

    // Processar mídia se necessário
    let finalMediaUrl = null;
    let finalMediaFilename = requestBody.p_media_filename;
    let finalMediaSize = requestBody.p_media_size;
    let finalMediaType = requestBody.p_media_type;

    // Mapear tipos de mídia da Evolution API para MIME types mais genéricos se necessário
    const mimeTypeMap: { [key: string]: string } = {
      'imageMessage': 'image/jpeg',
      'videoMessage': 'video/mp4',
      'audioMessage': 'audio/ogg', // WhatsApp usa OGG para áudio
      'pttMessage': 'audio/ogg', // PTT = Push To Talk (Áudio gravado na hora)
      'documentMessage': 'application/octet-stream', // Fallback genérico, mas vamos tentar pegar o mime real
      'documentWithCaptionMessage': 'application/octet-stream'
    };

    if (finalMediaType && mimeTypeMap[finalMediaType]) {
      finalMediaType = mimeTypeMap[finalMediaType];
    }

    // Se a API mandou o mimetype exato (ex: application/pdf), ele sobrepõe o genérico
    if (requestBody.p_media_mime) {
      finalMediaType = requestBody.p_media_mime.split(';')[0].trim();
    }

    // Preferir base64 direto enviado pela Evolution API (Evita baixar/descriptografar novamente)
    if (requestBody.p_media_base64) {
      console.log('📱 Processando mídia nativa via Base64 enviado no Webhook...');
      try {
        const uniqueFilename = `${Date.now()}_media${getFileExtension(finalMediaType)}`;
        const filePath = `media/${uniqueFilename}`;

        // Decodificar Base64
        const binaryData = Uint8Array.from(atob(requestBody.p_media_base64), c => c.charCodeAt(0));

        const { error: uploadError } = await supabaseClient.storage
          .from('whatsapp-media')
          .upload(filePath, binaryData, { contentType: finalMediaType });

        if (!uploadError) {
          const { data: urlData } = supabaseClient.storage.from('whatsapp-media').getPublicUrl(filePath);
          finalMediaUrl = urlData.publicUrl;
          finalMediaFilename = uniqueFilename;
          finalMediaSize = binaryData.length;
          console.log('✅ Mídia Base64 salva com sucesso:', finalMediaUrl);
        } else {
          console.warn('⚠️ Falha no upload Storage:', uploadError);
        }
      } catch (err: any) {
        console.warn('⚠️ Erro ao decodificar Base64:', err.message);
      }
    }
    // Fallback: Baixar e descriptografar mídia se base64 não estiver disponível
    else if (requestBody.p_media_url && requestBody.p_media_key) {
      console.log('📱 Processando mídia via URL...');

      // Ajustar tipo da chave, caso venha como objeto ao invés de string
      let mediaKeyStr = requestBody.p_media_key;
      if (typeof mediaKeyStr === 'object' && mediaKeyStr !== null) {
        const keyArray = Object.values(mediaKeyStr) as number[];
        mediaKeyStr = btoa(String.fromCharCode.apply(null, keyArray));
      }

      const mediaResult = await downloadAndDecryptMedia({
        mediaUrl: requestBody.p_media_url,
        mediaKey: mediaKeyStr,
        mediaType: finalMediaType,
        filename: requestBody.p_media_filename || `media_${Date.now()}`,
        supabaseClient
      });

      if (mediaResult.success) {
        finalMediaUrl = mediaResult.publicUrl;
        finalMediaFilename = mediaResult.filename;
        finalMediaSize = mediaResult.size;
        console.log('✅ Mídia (Decrypt) processada com sucesso:', finalMediaUrl);
      } else {
        console.warn('⚠️ Falha no processamento (Decrypt):', mediaResult.error);
      }
    }

    // Preparar parâmetros para a função do banco
    const functionParams = {
      p_user_id: requestBody.p_user_id,
      p_numero: requestBody.p_numero,
      p_mensagem: requestBody.p_mensagem || null,
      p_direcao: requestBody.p_direcao || false,
      p_data_hora: processedDateTime,
      p_nome_contato: requestBody.p_nome_contato || null,
      p_media_type: finalMediaType || null,
      p_media_url: finalMediaUrl || null,
      p_media_filename: finalMediaFilename || null,
      p_media_size: finalMediaSize || null,
      p_media_key: requestBody.p_media_key || null,
      p_is_group: requestBody.p_is_group || false,
      p_contact_photo: requestBody.p_contact_photo || null
    };

    console.log('🎯 Chamando process_webhook_message com parâmetros:', JSON.stringify(functionParams, null, 2));

    // Chamar a função do banco de dados
    const { data, error } = await supabaseClient.rpc('process_webhook_message', functionParams);

    if (error) {
      console.error('❌ Erro na função do banco:', error);
      throw error;
    }

    console.log('✅ Mensagem processada com sucesso. ID:', data);

    return new Response(JSON.stringify({
      success: true,
      message_id: data,
      processed_media: !!finalMediaUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('💥 Erro no webhook:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
