import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EVO_URL       = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE  = Deno.env.get("EVOLUTION_INSTANCE") ?? "agencia03";
const EVO_KEY       = Deno.env.get("EVOLUTION_API_KEY") ?? "E42F543C93BB-4A59-B3A1-8AA2E506DC00";

function formatPhoneBR(phone: string): string {
  const c = phone.replace(/\D/g, "");
  if (c.startsWith("55") && c.length >= 12) return `+${c}`;
  if (c.length === 11) return `+55${c}`;
  if (c.length === 10) return `+55${c}`;
  return phone; // group JID ou formato desconhecido: passa sem alterar
}

async function sendWhatsApp(number: string, text: string): Promise<void> {
  const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({ number, text }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Evolution API ${r.status}: ${err}`);
  }
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Busca mensagens pendentes com scheduled_at <= agora
  const { data: messages, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString());

  if (error) {
    console.error("Erro ao buscar mensagens agendadas:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  if (!messages?.length) {
    await supabase
      .from("automations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("jobname", "send-scheduled-messages");
    return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200 });
  }

  let sent = 0, failed = 0;

  for (const msg of messages) {
    try {
      await sendWhatsApp(formatPhoneBR(msg.phone), msg.message);

      await supabase
        .from("scheduled_messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", msg.id);

      sent++;
    } catch (e) {
      const errMsg = (e as Error).message;
      console.error(`Falha ao enviar mensagem ${msg.id}:`, errMsg);

      await supabase
        .from("scheduled_messages")
        .update({ status: "failed", error_message: errMsg, updated_at: new Date().toISOString() })
        .eq("id", msg.id);

      failed++;
    }
  }

  await supabase
    .from("automations")
    .update({ last_triggered_at: new Date().toISOString() })
    .eq("jobname", "send-scheduled-messages");

  console.log(`send-scheduled-messages: sent=${sent}, failed=${failed}`);
  return new Response(JSON.stringify({ success: true, sent, failed }), { status: 200 });
});
