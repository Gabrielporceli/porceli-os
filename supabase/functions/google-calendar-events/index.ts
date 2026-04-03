import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    // Autenticar usuário
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) throw new Error('Não autenticado')

    const adminSupabase = createClient(supabaseUrl, serviceKey)

    // Buscar tokens do usuário
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ connected: false, events: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let accessToken = tokenData.access_token

    // Renovar token se expirado (com 5min de margem)
    if (tokenData.expiry_date && Date.now() > tokenData.expiry_date - 300000) {
      const newTokens = await refreshAccessToken(tokenData.refresh_token, clientId, clientSecret)
      if (newTokens.access_token) {
        accessToken = newTokens.access_token
        await adminSupabase
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            expiry_date: Date.now() + (newTokens.expires_in * 1000),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    }

    // Buscar parâmetros da query
    const url = new URL(req.url)
    const timeMin = url.searchParams.get('timeMin') ?? new Date().toISOString()
    const timeMax = url.searchParams.get('timeMax') ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Buscar eventos do Google Calendar
    const calendarRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      }),
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    const calendarData = await calendarRes.json()

    if (calendarData.error) {
      throw new Error(calendarData.error.message)
    }

    const events = (calendarData.items ?? []).map((item: any) => ({
      id: item.id,
      title: item.summary ?? '(Sem título)',
      description: item.description,
      start: item.start?.dateTime ?? item.start?.date,
      end: item.end?.dateTime ?? item.end?.date,
      allDay: !item.start?.dateTime,
      location: item.location,
      htmlLink: item.htmlLink,
      status: item.status,
      colorId: item.colorId,
    }))

    return new Response(
      JSON.stringify({ connected: true, events }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
