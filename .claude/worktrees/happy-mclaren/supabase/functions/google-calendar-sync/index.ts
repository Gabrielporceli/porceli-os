import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Renova o access_token usando o refresh_token
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description ?? data.error);
  return data;
}

// Cria ou atualiza um evento no Google Calendar
async function upsertCalendarEvent(
  accessToken: string,
  calendarId: string,
  meeting: {
    id: string;
    scheduled_at: string;
    leads?: { name: string; company: string | null } | null;
    gcal_event_id?: string | null;
  }
): Promise<string> {
  const startTime = new Date(meeting.scheduled_at);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1h

  const eventPayload = {
    summary: `Reunião: ${meeting.leads?.name ?? "Lead"}`,
    description: meeting.leads?.company
      ? `Empresa: ${meeting.leads.company}`
      : "Reunião agendada pelo CRM Goat",
    start: { dateTime: startTime.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: endTime.toISOString(), timeZone: "America/Sao_Paulo" },
    extendedProperties: {
      private: { crm_meeting_id: meeting.id },
    },
  };

  const hasExistingEvent = !!meeting.gcal_event_id;
  const url = hasExistingEvent
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${meeting.gcal_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(url, {
    method: hasExistingEvent ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventPayload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Erro ao criar evento no Google Calendar");
  return data.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca a integração do usuário
    const { data: integration, error: integError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .eq("is_active", true)
      .maybeSingle();

    if (integError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integração com Google Calendar não encontrada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const calendarId = integration.config?.calendar_id ?? "primary";

    let accessToken = integration.access_token;

    // Renova o token se estiver expirado
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
    const isExpired = !expiresAt || expiresAt < new Date(Date.now() + 60_000);

    if (isExpired && integration.refresh_token) {
      const refreshed = await refreshAccessToken(integration.refresh_token, clientId, clientSecret);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabaseAdmin
        .from("integrations")
        .update({ access_token: accessToken, token_expires_at: newExpiry })
        .eq("id", integration.id);
    }

    // Busca reuniões do usuário (agendadas e confirmadas)
    const { data: meetings } = await supabaseAdmin
      .from("sdr_meetings")
      .select("id, scheduled_at, status, gcal_event_id, leads(name, company, user_id)")
      .in("status", ["scheduled", "confirmed"])
      .not("leads", "is", null);

    const userMeetings = (meetings ?? []).filter(
      (m: { leads?: { user_id: string } | null }) => m.leads?.user_id === user.id
    );

    let synced = 0;
    for (const meeting of userMeetings) {
      try {
        const gcalEventId = await upsertCalendarEvent(accessToken!, calendarId, meeting);

        // Salva o gcal_event_id na reunião para updates futuros
        if (!meeting.gcal_event_id) {
          await supabaseAdmin
            .from("sdr_meetings")
            .update({ gcal_event_id: gcalEventId })
            .eq("id", meeting.id);
        }
        synced++;
      } catch (err) {
        console.error(`Erro ao sincronizar reunião ${meeting.id}:`, err);
      }
    }

    // Atualiza last_sync_at
    await supabaseAdmin
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({ success: true, synced, total: userMeetings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Erro crítico:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
