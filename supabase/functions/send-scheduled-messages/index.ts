import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EVO_URL       = Deno.env.get("EVOLUTION_API_URL") ?? "https://api.gabrielporceli.com.br";
const EVO_INSTANCE  = Deno.env.get("EVOLUTION_INSTANCE") ?? "agencia03";
const EVO_KEY       = Deno.env.get("EVOLUTION_API_KEY") ?? "E42F543C93BB-4A59-B3A1-8AA2E506DC00";

const FONTE = "send-scheduled-messages"

// ── Fila única de WhatsApp ─────────────────────────────────────────────────
// Esta função NÃO fala com a Evolution: só coloca a mensagem em
// whatsapp_outbox, e o worker whatsapp-outbox envia (com intervalo, retentativa
// e segurando enquanto o WhatsApp estiver desconectado). A dedupe_key padrão —
// origem + número + texto + dia — faz uma retentativa do cron (ou uma chamada
// repetida) nunca duplicar a mesma mensagem.
const outboxDb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

async function hashCurto(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(b)).slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join("")
}

async function enfileirarWhatsApp(
  number: string,
  text: string,
  opts: { dedupe?: string; refTable?: string; refId?: string; expiresAt?: string } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const dedupe = opts.dedupe ?? `${FONTE}:${number}:${await hashCurto(text)}:${new Date().toISOString().slice(0, 10)}`
  const { data, error } = await outboxDb
    .from("whatsapp_outbox")
    .upsert(
      { number, text, source: FONTE, dedupe_key: dedupe, ref_table: opts.refTable ?? null, ref_id: opts.refId ?? null, expires_at: opts.expiresAt ?? null },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle()
  if (error) return { ok: false, error: `fila: ${error.message}` }
  return { ok: true, id: (data as { id?: string } | null)?.id }
}

function formatPhoneBR(phone: string): string {
  const c = phone.replace(/\D/g, "");
  if (c.startsWith("55") && c.length >= 12) return `+${c}`;
  if (c.length === 11) return `+55${c}`;
  if (c.length === 10) return `+55${c}`;
  return phone; // group JID ou formato desconhecido: passa sem alterar
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

  // Só enfileira: o worker whatsapp-outbox envia e devolve o status
  // (sent/failed) para scheduled_messages. A mensagem continua "pending" até
  // sair de verdade; como a dedupe_key é por mensagem, a próxima execução não
  // enfileira de novo.
  let sent = 0, failed = 0;

  for (const msg of messages) {
    const fila = await enfileirarWhatsApp(formatPhoneBR(msg.phone), msg.message, {
      dedupe: `agendada:${msg.id}`,
      refTable: "scheduled_messages",
      refId: msg.id,
    });
    if (fila.ok) { if (fila.id) sent++; }
    else { failed++; console.error(`Falha ao enfileirar ${msg.id}:`, fila.error); }
  }

  await supabase
    .from("automations")
    .update({ last_triggered_at: new Date().toISOString() })
    .eq("jobname", "send-scheduled-messages");

  console.log(`send-scheduled-messages: sent=${sent}, failed=${failed}`);
  return new Response(JSON.stringify({ success: failed === 0, enfileiradas: sent, failed }), { status: 200 });
});
