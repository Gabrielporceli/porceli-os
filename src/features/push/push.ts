/**
 * Notificações push do Porceli OS (aprovações dos agentes).
 *
 * No iPhone isso só existe com o app instalado na tela de início (iOS 16.4+):
 * numa aba do Safari o navegador nem expõe a API, e `pushSuportado()` volta
 * falso. A permissão tem que ser pedida num toque do usuário, por isso existe
 * um botão (BotaoNotificacoes), não um pedido automático ao abrir.
 *
 * Caminho: este arquivo registra o service worker (public/sw.js), inscreve o
 * aparelho e grava a inscrição em `push_inscricoes`. Quem envia é a função
 * `avisar-aprovacao`, chamada pelo gatilho em `agente_aprovacoes`.
 */
import { supabase } from "@/integrations/supabase/client";

export type EstadoPush = "sem-suporte" | "negado" | "ativo" | "inativo";

export const pushSuportado = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** Chave pública VAPID (base64url) no formato que o navegador pede. */
function chaveParaBytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

const registro = () => navigator.serviceWorker.register("/sw.js");

/**
 * Chave pública VAPID, entregue pela função `avisar-aprovacao`. Guardada na
 * memória: `ativarPush` precisa dela pronta, sem espera, logo depois do toque.
 * `null` = a função não respondeu (ainda não publicada, ou sem rede).
 */
let chaveGuardada: Promise<string | null> | null = null;
function chavePublica() {
  chaveGuardada ??= supabase.functions
    .invoke("avisar-aprovacao", { method: "GET" })
    .then(({ data, error }) => (error ? null : ((data as { chave?: string } | null)?.chave ?? null)))
    .catch(() => null);
  return chaveGuardada;
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSuportado()) return "sem-suporte";
  // Sem o lado do servidor não há o que ligar: o botão nem aparece.
  if (!(await chavePublica())) {
    chaveGuardada = null;
    return "sem-suporte";
  }
  if (Notification.permission === "denied") return "negado";
  if (Notification.permission !== "granted") return "inativo";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao ? "ativo" : "inativo";
}

/** Pede a permissão, inscreve o aparelho e grava a inscrição. */
export async function ativarPush(): Promise<EstadoPush> {
  if (!pushSuportado()) return "sem-suporte";
  // A permissão vem ANTES de qualquer espera longa: o iOS só mostra o pedido
  // se ele sair logo depois do toque.
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "negado" : "inativo";

  const reg = await registro();
  await navigator.serviceWorker.ready;

  const chave = await chavePublica();
  if (!chave) throw new Error("Não consegui a chave de notificação.");

  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }));

  const dados = inscricao.toJSON();
  const { error: erroGravar } = await supabase.from("push_inscricoes" as never).upsert(
    {
      endpoint: inscricao.endpoint,
      p256dh: dados.keys?.p256dh,
      auth: dados.keys?.auth,
      aparelho: navigator.userAgent.slice(0, 200),
    } as never,
    { onConflict: "endpoint" },
  );
  if (erroGravar) throw new Error(erroGravar.message);
  return "ativo";
}

/** Cancela a inscrição deste aparelho e apaga a linha dele. */
export async function desativarPush(): Promise<EstadoPush> {
  if (!pushSuportado()) return "sem-suporte";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const inscricao = await reg?.pushManager.getSubscription();
  if (inscricao) {
    await supabase.from("push_inscricoes" as never).delete().eq("endpoint", inscricao.endpoint);
    await inscricao.unsubscribe();
  }
  return "inativo";
}

/** Número de pendências no ícone do app (iOS 16.4+ instalado; no resto, nada). */
export function atualizarSelo(pendentes: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (pendentes > 0) nav.setAppBadge?.(pendentes)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* sem suporte a selo */
  }
}

/**
 * Toque numa notificação com o app já aberto: o service worker manda
 * `{ tipo: "abrir", url }` e quem troca de tela é o próprio app.
 */
export function ouvirPushAbrir(abrir: (url: string) => void) {
  if (!("serviceWorker" in navigator)) return () => {};
  const aoReceber = (e: MessageEvent) => {
    if (e.data?.tipo === "abrir" && typeof e.data.url === "string") abrir(e.data.url);
  };
  navigator.serviceWorker.addEventListener("message", aoReceber);
  return () => navigator.serviceWorker.removeEventListener("message", aoReceber);
}
