import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'messages-media'
const RETENTION_DAYS = 30

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
    console.log(`🗑️ Removendo arquivos anteriores a ${cutoff.toISOString()}`)

    // Listar todos os arquivos do bucket recursivamente
    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } })

    if (listError) throw listError

    if (!objects || objects.length === 0) {
      console.log('Nenhum arquivo encontrado.')
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Filtrar arquivos antigos — created_at vem do metadata do storage
    const toDelete: string[] = []

    for (const obj of objects) {
      // Listar sub-pastas (cada user_id é uma pasta)
      if (!obj.id) {
        // É uma "pasta" — listar dentro dela
        const { data: subObjects } = await supabase.storage
          .from(BUCKET)
          .list(obj.name, { limit: 1000 })

        for (const sub of subObjects ?? []) {
          const createdAt = sub.created_at ? new Date(sub.created_at) : null
          if (createdAt && createdAt < cutoff) {
            toDelete.push(`${obj.name}/${sub.name}`)
          }
        }
      } else {
        const createdAt = obj.created_at ? new Date(obj.created_at) : null
        if (createdAt && createdAt < cutoff) {
          toDelete.push(obj.name)
        }
      }
    }

    if (toDelete.length === 0) {
      console.log('Nenhum arquivo para remover.')
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🗑️ Deletando ${toDelete.length} arquivo(s)...`)
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove(toDelete)

    if (deleteError) throw deleteError

    console.log(`✅ ${toDelete.length} arquivo(s) removido(s).`)
    return new Response(
      JSON.stringify({ deleted: toDelete.length, files: toDelete }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const err = error as Error
    console.error('Erro na limpeza:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
