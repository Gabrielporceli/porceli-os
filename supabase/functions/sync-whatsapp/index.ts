import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JOBNAME = 'sync-whatsapp-lote'
const CHAT_BATCH = 20
const CONTACT_BATCH = 20

type SyncState = {
  phase: 'groups' | 'chats' | 'contacts'
  chatOffset: number
  contactOffset: number
}

const DEFAULT_STATE: SyncState = { phase: 'groups', chatOffset: 0, contactOffset: 0 }

// Sincroniza WhatsApp em lotes pequenos, uma fase (grupos -> chats -> contatos)
// por execução, salvando o progresso em automations.config. Antes processava
// TUDO numa chamada só (até 100 chats + até 200 contatos, cada um com 1-2
// idas ao banco) e estourava o limite de recursos do compute Nano
// (WORKER_RESOURCE_LIMIT). Rodando a cada poucos minutos via cron, o ciclo
// completo demora mais (prolongado) mas cada chamada fica dentro do limite
// (limitado) — e ao terminar um ciclo, recomeça do zero pra pegar novidades.
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
    const evolutionApiKey = "E42F543C93BB-4A59-B3A1-8AA2E506DC00"
    const evolutionInstance = "agencia03"
    const defaultUserId = Deno.env.get('DEFAULT_USER_ID') || 'bad3abae-951e-49a4-8738-9037661fd5a1'

    const { data: automation } = await supabaseClient
      .from('automations')
      .select('config')
      .eq('jobname', JOBNAME)
      .maybeSingle()

    const state: SyncState = { ...DEFAULT_STATE, ...((automation?.config as Partial<SyncState>) ?? {}) }

    let result: Record<string, unknown> = {}

    if (state.phase === 'groups') {
      // Grupos costumam ser poucos — sincroniza todos de uma vez nesta fase.
      const groupsResponse = await fetch(`${evolutionUrl}/group/fetchAllGroups/${evolutionInstance}?getParticipants=false`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
      const groupsData: any[] = groupsResponse.ok ? await groupsResponse.json() : []

      for (const group of groupsData) {
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

      result = { phase: 'groups', groupsSynced: groupsData.length }
      state.phase = 'chats'
      state.chatOffset = 0

    } else if (state.phase === 'chats') {
      const groupsResponse = await fetch(`${evolutionUrl}/group/fetchAllGroups/${evolutionInstance}?getParticipants=false`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
      const activeGroupIds = new Set<string>()
      if (groupsResponse.ok) {
        const groupsData: any[] = await groupsResponse.json()
        groupsData.forEach((g: any) => {
          const id = g.id || g.remoteJid || g.jid
          if (id) activeGroupIds.add(id)
        })
      }

      const chatsResponse = await fetch(`${evolutionUrl}/chat/findChats/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100, where: {} })
      })
      if (!chatsResponse.ok) {
        const errorText = await chatsResponse.text()
        throw new Error(`Erro ao buscar chats: ${chatsResponse.status} - ${errorText}`)
      }
      const chatsData = await chatsResponse.json()
      const chats: any[] = chatsData.chats || chatsData || []

      const slice = chats.slice(state.chatOffset, state.chatOffset + CHAT_BATCH)
      for (const chat of slice) {
        const remoteJid = chat.id || chat.remoteJid || chat.jid
        if (!remoteJid || (!remoteJid.includes('@') && !/^\d+$/.test(remoteJid))) continue

        const isGroup = chat.isGroup || remoteJid.endsWith('@g.us')

        // FILTRO DE LIMPEZA: grupo que saiu da lista de ativos some do dashboard
        if (isGroup && !activeGroupIds.has(remoteJid)) {
          await supabaseClient.from('conversations').delete().eq('remote_jid', remoteJid).eq('user_id', defaultUserId)
          continue
        }

        const name = chat.name || chat.pushName || (isGroup ? 'Grupo sem nome' : 'Contato sem nome')
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

      const nextOffset = state.chatOffset + slice.length
      result = { phase: 'chats', chatsTotal: chats.length, chatsProcessedThisRun: slice.length, chatOffset: nextOffset }

      if (nextOffset >= chats.length) {
        state.phase = 'contacts'
        state.contactOffset = 0
      } else {
        state.chatOffset = nextOffset
      }

    } else {
      const contactsResponse = await fetch(`${evolutionUrl}/chat/findContacts/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 200 })
      })

      let contacts: any[] = []
      if (contactsResponse.ok) {
        const contactsDataRaw = await contactsResponse.json()
        contacts = contactsDataRaw.contacts || contactsDataRaw || []
      }

      const slice = contacts.slice(state.contactOffset, state.contactOffset + CONTACT_BATCH)
      for (const contact of slice) {
        const contactId = contact.id || contact.remoteJid || contact.jid
        if (!contactId || contactId.endsWith('@g.us')) continue
        const phone_clean = contactId.split('@')[0].replace(/[^0-9]/g, '')

        await supabaseClient.from('contatos').upsert({
          user_id: defaultUserId,
          numero: phone_clean,
          nome: contact.name || contact.pushName || contact.verifiedName,
          photo_url: contact.profilePicUrl || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,numero' })

        await supabaseClient.from('leads').update({
          photo_url: contact.profilePicUrl || null,
          name: contact.name || contact.pushName || contact.verifiedName
        }).eq('phone', phone_clean).eq('user_id', defaultUserId)
      }

      const nextOffset = state.contactOffset + slice.length
      result = { phase: 'contacts', contactsTotal: contacts.length, contactsProcessedThisRun: slice.length, contactOffset: nextOffset }

      if (nextOffset >= contacts.length) {
        // ciclo completo — recomeça do zero pra pegar chats/contatos novos
        state.phase = 'groups'
        state.chatOffset = 0
        state.contactOffset = 0
      } else {
        state.contactOffset = nextOffset
      }
    }

    await supabaseClient
      .from('automations')
      .update({ config: state, last_triggered_at: new Date().toISOString() })
      .eq('jobname', JOBNAME)

    return new Response(JSON.stringify({ success: true, ...result, nextPhase: state.phase }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Erro na sincronizacao:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
