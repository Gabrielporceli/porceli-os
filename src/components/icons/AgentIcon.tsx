import type { SVGProps } from "react";

/**
 * Ícone dos agentes: o próprio orbe — uma esfera com os dois olhinhos —, no
 * traço fino do Iconsax Linear (24px, 1.5 de espessura) pra combinar com o
 * resto da barra. Usa `currentColor`, então responde às classes `text-*`.
 */
export function AgentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9 10.25v2.5M15 10.25v2.5" strokeWidth={2} />
      {/* Brilho no alto da esfera, como no orbe. */}
      <path d="M6.9 7.2a7 7 0 0 1 3-2" opacity={0.55} />
    </svg>
  );
}
