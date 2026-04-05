import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const evolutionUrl = (Deno.env.get('EVOLUTION_URL') || 'https://api.gabrielporceli.com.br').trim()
    const evolutionApiKey = (Deno.env.get('EVOLUTION_API_KEY') || '2C2B8ACDE0FB-44EA-BD01-59E39E4A9E76').trim()
    const evolutionInstance = (Deno.env.get('EVOLUTION_INSTANCE') || 'agencia02').trim()
    const defaultUserId = Deno.env.get('DEFAULT_USER_ID') || 'bad3abae-951e-49a4-8738-9037661fd5a1'

    console.log(`🔄 Iniciando sincronização WhatsApp para instância: ${evolutionInstance}`)

    // 1. Buscar Chats (Conversas ativas)
    const chatsResponse = await fetch(`${evolutionUrl}/chat/findChats/${evolutionInstance}`, {
      method: 'POST',
      headers: { 
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 100,
        where: {}
      })
    })
    
    if (!chatsResponse.ok) {
      const errorText = await chatsResponse.text()
      throw new Error(`Erro ao buscar chats: ${chatsResponse.status} - ${errorText}`)
    }
    
    const chatsData = await chatsResponse.json()
    const chats = chatsData.chats || chatsData || []
    console.log(`📦 Encontrados ${chats.length} chats para sincronizar.`)

    for (const chat of chats) {
      const remoteJid = chat.id || chat.remoteJid || chat.jid
      if (!remoteJid) continue

      const isGroup = chat.isGroup || remoteJid.endsWith('@g.us')
      const name = chat.name || chat.pushName || (isGroup ? 'Grupo sem nome' : 'Contato sem nome')
      
      // Upsert na tabela de conversas usando RPC
      await supabaseClient.rpc('process_webhook_message', {
        p_user_id: defaultUserId,
        p_numero: remoteJid,
        p_mensagem: chat.lastMessage?.message?.conversation || chat.lastMessage?.message?.extendedTextMessage?.text || 'Sincronizado',
        p_direcao: chat.lastMessage?.key?.fromMe || false,
        p_data_hora: new Date().toISOString(),
        p_nome_contato: name,
        p_is_group: isGroup,
        p_contact_photo: chat.profilePicUrl || null
      })
    }

    // 2. Buscar Contatos
    const contactsResponse = await fetch(`${evolutionUrl}/chat/findContacts/${evolutionInstance}`, {
      method: 'POST',
      headers: { 
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 200
      })
    })
    
    if (contactsResponse.ok) {
       const contactsData = await contactsResponse.json()
       const contacts = contactsData.contacts || contactsData || []
       console.log(`👤 Sincronizando ${contacts.length} contatos...`)
       for (const contact of contacts) {
         const contactId = contact.id || contact.remoteJid || contact.jid
         if (!contactId) continue
         const phone_clean = contactId.split('@')[0].replace(/[^0-9]/g, '')
         
         await supabaseClient.from('contatos').upsert({
           user_id: defaultUserId,
           numero: phone_clean,
           nome: contact.name || contact.pushName || contact.verifiedName,
           photo_url: contact.profilePicUrl || null,
           updated_at: new Date().toISOString()
         }, { onConflict: 'user_id,numero' })

         // Também tenta atualizar o lead se existir
         await supabaseClient.from('leads').update({
           photo_url: contact.profilePicUrl || null,
           name: contact.name || contact.pushName || contact.verifiedName
         }).eq('phone', phone_clean).eq('user_id', defaultUserId)
       }
    }

    // 3. Buscar Grupos (Garante que todos os grupos apareçam)
    const groupsResponse = await fetch(`${evolutionUrl}/group/fetchAllGroups/${evolutionInstance}?getParticipants=false`, {
      method: 'GET',
      headers: { 'apikey': evolutionApiKey }
    })
    
    let groupsSyncedCount = 0
    if (groupsResponse.ok) {
       const groups = await groupsResponse.json()
       groupsSyncedCount = groups.length
       console.log(`👥 Sincronizando ${groupsSyncedCount} grupos...`)
       for (const group of groups) {
         const groupId = group.id || group.remoteJid || group.jid
         if (!groupId) continue
         
         await supabaseClient.rpc('process_webhook_message', {
           p_user_id: defaultUserId,
           p_numero: groupId,
           p_mensagem: 'Grupo sincronizado',
           p_direcao: false,
           p_data_hora: new Date().toISOString(),
           p_nome_contato: group.subject || group.name || 'Grupo sem nome',
           p_is_group: true,
           p_contact_photo: group.profilePicUrl || null
         })
       }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      chats_synced: chats.length,
      groups_synced: groupsSyncedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
