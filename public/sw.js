// Service worker do Porceli OS: só notificações push.
//
// De propósito NÃO há handler de `fetch` nem cache: o app continua vindo
// sempre da rede, e um deploy novo na Vercel aparece na hora, sem versão
// velha presa no aparelho.
//
// Quem manda o push é a função `avisar-aprovacao` do Supabase, disparada pelo
// gatilho em `agente_aprovacoes`. Corpo esperado (JSON):
//   { titulo, corpo, url, tag, pendentes }

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = {};
  }
  event.waitUntil(
    (async () => {
      // O iOS exige que todo push mostre uma notificação visível.
      await self.registration.showNotification(d.titulo || "Porceli OS", {
        body: d.corpo || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: d.tag || "porceli-os",
        data: { url: d.url || "/" },
      });
      // Número no ícone do app (iOS 16.4+ com o app na tela de início).
      if (typeof d.pendentes === "number" && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(d.pendentes);
        } catch {
          /* sem suporte a selo: a notificação já saiu */
        }
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
  const url = new URL(destino, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const janela of janelas) {
        // App já aberto: traz pra frente e pede pra ele mesmo trocar de tela
        // (ver ouvirPushAbrir em src/features/push/push.ts).
        if ("focus" in janela) {
          await janela.focus();
          janela.postMessage({ tipo: "abrir", url: destino });
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
