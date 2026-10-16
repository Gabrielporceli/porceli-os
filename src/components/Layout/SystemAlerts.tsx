/**
 * Pilha de avisos do sistema no canto inferior direito: WhatsApp desconectado
 * e falhas das automações. Vai direto no <body> (portal) para ficar presa ao
 * canto mesmo dentro de páginas com transform/animação, e não empurra o
 * conteúdo. No celular sobe acima da barra de navegação inferior.
 */
import { createPortal } from "react-dom";
import { WhatsappBanner } from "./WhatsappBanner";
import { SystemHealthAlert } from "./SystemHealthAlert";

export function SystemAlerts() {
  return createPortal(
    <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 md:bottom-4">
      <WhatsappBanner />
      <SystemHealthAlert />
    </div>,
    document.body
  );
}
