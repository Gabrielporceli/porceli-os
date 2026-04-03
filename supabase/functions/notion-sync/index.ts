import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotionRichText {
  type: "text";
  text: { content: string };
}

function richText(content: string): NotionRichText[] {
  return [{ type: "text", text: { content } }];
}

// Cria uma página no banco de dados do Notion
async function createNotionPage(
  token: string,
  databaseId: string,
  meeting: {
    id: string;
    scheduled_at: string;
    status: string;
    leads?: { name: string; company: string | null; email: string | null } | null;
  }
): Promise<string> {
  const statusMap: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    done: "Realizado",
    no_show: "No-show",
    cancelled: "Cancelado",
  };

  const payload = {
    parent: { database_id: databaseId },
    properties: {
      Nome: {
        title: richText(meeting.leads?.name ?? "Lead"),
      },
      Empresa: {
        rich_text: richText(meeting.leads?.company ?? ""),
      },
      Email: {
        email: meeting.leads?.email ?? null,
      },
      "Data da Reunião": {
        date: { start: meeting.scheduled_at },
      },
      Status: {
        select: { name: statusMap[meeting.status] ?? meeting.status },
      },
      "ID CRM": {
        rich_text: richText(meeting.id),
      },
    },
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Erro ao criar página no Notion");
  }
  return data.id as string;
}

// Verifica se já existe uma página para este meeting_id
async function findExistingPage(
  token: string,
  databaseId: string,
  meetingId: string
): Promise<string | null> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: {
        property: "ID CRM",
        rich_text: { equals: meetingId },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.results?.length) return null;
  return data.results[0].id as string;
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

    // Busca integração Notion do usuário
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "notion")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: "Integração com Notion não encontrada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notionToken = integration.config?.notion_token;
    const databaseId = integration.config?.database_id;

    if (!notionToken || !databaseId) {
      return new Response(
        JSON.stringify({ error: "Token ou ID do banco de dados do Notion não configurados." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca reuniões do usuário
    const { data: meetings } = await supabaseAdmin
      .from("sdr_meetings")
      .select("id, scheduled_at, status, leads(name, company, email, user_id)")
      .in("status", ["scheduled", "confirmed", "done"])
      .not("leads", "is", null);

    const userMeetings = (meetings ?? []).filter(
      (m: { leads?: { user_id: string } | null }) => m.leads?.user_id === user.id
    );

    let synced = 0;
    for (const meeting of userMeetings) {
      try {
        // Verifica se já foi enviado antes (evita duplicatas)
        const existingPageId = await findExistingPage(notionToken, databaseId, meeting.id);
        if (existingPageId) {
          // Já existe — pula (poderia atualizar no futuro)
          continue;
        }
        await createNotionPage(notionToken, databaseId, meeting);
        synced++;
      } catch (err) {
        console.error(`Erro ao enviar reunião ${meeting.id} para Notion:`, err);
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
