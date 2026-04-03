import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // JWT do usuário
  const error = url.searchParams.get('error')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? supabaseUrl

  if (error) {
    return Response.redirect(`${frontendUrl}/calendar?error=google_auth_denied`)
  }

  if (!code || !state) {
    return Response.redirect(`${frontendUrl}/calendar?error=missing_params`)
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`

    // Trocar code por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      throw new Error(tokens.error_description ?? tokens.error)
    }

    // Usar o JWT (state) para identificar o usuário
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Decodificar o JWT para pegar o user_id
    const payload = JSON.parse(atob(state.split('.')[1]))
    const userId = payload.sub

    // Salvar tokens no banco
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expiry_date: Date.now() + (tokens.expires_in * 1000),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (dbError) throw dbError

    return Response.redirect(`${frontendUrl}/calendar?connected=google`)
  } catch (err) {
    console.error('Erro no callback Google:', err)
    return Response.redirect(`${frontendUrl}/calendar?error=google_auth_failed`)
  }
})
