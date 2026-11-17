// ─────────────────────────────────────────────────────────────────────────
// avisar-aprovacao — notificação push quando um agente pede aprovação.
//
// GET                      → { chave }: a chave pública VAPID, que o app usa
//                            pra inscrever o aparelho (público, é chave pública)
// GET  ?diagnostico=1      → testa a criptografia do push neste runtime, sem
//                            mandar nada pra ninguém
// POST { id }              → chamado pelo gatilho `avisar_aprovacao_push` em
//                            `agente_aprovacoes`; manda o push pros aparelhos
//                            do dono daquele pedido
//
// O POST só vale com o cabeçalho `x-push-segredo` igual ao segredo guardado em
// `push_config` (gerado dentro do banco pela migração; nunca sai de lá). O
// corpo só traz o id: título e dono do pedido são lidos do banco, então quem
// chamar não consegue inventar o texto da notificação.
//
// O par de chaves VAPID é gerado aqui, na primeira chamada, e fica em
// `push_config` (RLS ligado e sem política: só a service role lê). A chave
// privada nunca passa pelo repositório nem por variável de ambiente.
//
// Sem custo: o push do navegador (Apple, Google, Mozilla) é gratuito.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

/** Identificação do remetente exigida pelo protocolo (URL do próprio app). */
const ASSUNTO = "https://porceli-os.vercel.app";

async function lerConfig(chaves: string[]) {
  const { data, error } = await db.from("push_config").select("chave, valor").in("chave", chaves);
  if (error) throw new Error(`push_config: ${error.message}`);
  return Object.fromEntries((data ?? []).map((l) => [l.chave, l.valor])) as Record<string, string>;
}

/** Par VAPID: lê do banco; na primeira vez gera e grava. */
async function chavesVapid() {
  let cfg = await lerConfig(["vapid_publica", "vapid_privada"]);
  if (!cfg.vapid_publica || !cfg.vapid_privada) {
    const novas = webpush.generateVAPIDKeys();
    // ignoreDuplicates: se duas chamadas gerarem ao mesmo tempo, vale a que
    // gravou primeiro, e as duas passam a ler a mesma.
    await db.from("push_config").upsert(
      [
        { chave: "vapid_publica", valor: novas.publicKey },
        { chave: "vapid_privada", valor: novas.privateKey },
      ],
      { onConflict: "chave", ignoreDuplicates: true },
    );
    cfg = await lerConfig(["vapid_publica", "vapid_privada"]);
  }
  return { publica: cfg.vapid_publica, privada: cfg.vapid_privada };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const vapid = await chavesVapid();

    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("diagnostico") === "1") {
        // Inscrição de mentira, gerada aqui: monta a requisição cifrada sem
        // enviar. Prova que a criptografia do push roda neste runtime.
        const falsa = webpush.generateVAPIDKeys();
        const detalhes = webpush.generateRequestDetails(
          {
            endpoint: "https://exemplo.invalid/push/teste",
            keys: { p256dh: falsa.publicKey, auth: btoa("0123456789abcdef").replace(/=+$/, "") },
          },
          JSON.stringify({ titulo: "teste" }),
          { vapidDetails: { subject: ASSUNTO, publicKey: vapid.publica, privateKey: vapid.privada } },
        );
        return json({ ok: true, bytes: detalhes.body?.length ?? 0, cabecalhos: Object.keys(detalhes.headers ?? {}) });
      }
      return json({ chave: vapid.publica });
    }

    if (req.method !== "POST") return json({ erro: "método não aceito" }, 405);

    const { gatilho_segredo } = await lerConfig(["gatilho_segredo"]);
    if (!gatilho_segredo || req.headers.get("x-push-segredo") !== gatilho_segredo) {
      return json({ erro: "não autorizado" }, 401);
    }

    const { id } = await req.json().catch(() => ({ id: null }));
    if (typeof id !== "string") return json({ erro: "id ausente" }, 400);

    const { data: pedido } = await db
      .from("agente_aprovacoes")
      .select("id, user_id, titulo, cliente, status")
      .eq("id", id)
      .maybeSingle();
    if (!pedido || pedido.status !== "pendente") return json({ enviados: 0, motivo: "sem pedido pendente" });

    const [{ data: inscricoes }, { count: pendentes }] = await Promise.all([
      db.from("push_inscricoes").select("id, endpoint, p256dh, auth").eq("user_id", pedido.user_id),
      db
        .from("agente_aprovacoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", pedido.user_id)
        .eq("status", "pendente"),
    ]);
    if (!inscricoes || inscricoes.length === 0) return json({ enviados: 0, motivo: "nenhum aparelho inscrito" });

    const corpo = JSON.stringify({
      titulo: "Aprovação pendente",
      corpo: String(pedido.titulo).slice(0, 180),
      url: "/agents?aprovacoes=1",
      tag: `aprovacao-${pedido.id}`,
      pendentes: pendentes ?? 1,
    });

    let enviados = 0;
    const mortas: string[] = [];
    const falhas: string[] = [];
    await Promise.all(
      inscricoes.map(async (i) => {
        try {
          await webpush.sendNotification(
            { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
            corpo,
            {
              vapidDetails: { subject: ASSUNTO, publicKey: vapid.publica, privateKey: vapid.privada },
              TTL: 60 * 60 * 24,
              urgency: "high",
            },
          );
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: o aparelho cancelou a inscrição (app removido, permissão
          // retirada). A linha sai pra não tentar de novo.
          if (status === 404 || status === 410) mortas.push(i.id);
          else falhas.push(String(status ?? (e as Error).message));
        }
      }),
    );
    if (mortas.length > 0) await db.from("push_inscricoes").delete().in("id", mortas);

    return json({ enviados, removidos: mortas.length, falhas });
  } catch (e) {
    console.error("avisar-aprovacao", e);
    return json({ erro: (e as Error).message }, 500);
  }
});
