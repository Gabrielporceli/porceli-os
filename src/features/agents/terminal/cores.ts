import { ORB_COLORS, defaultOrbColor, type AvatarColor } from "@/components/ui/orb-avatar";

/**
 * Cor de destaque de cada terminal. Usa o mesmo campo `cor` dos orbes, então
 * a cor escolhida no diálogo do agente vale aqui também.
 */
export const COR_TERMINAL: Record<AvatarColor, string> = {
  blue: "#60a5fa",
  orange: "#fb923c",
  red: "#f87171",
  green: "#4ade80",
  purple: "#a78bfa",
  yellow: "#facc15",
  cyan: "#22d3ee",
  pink: "#f472b6",
  indigo: "#818cf8",
  lime: "#a3e635",
  turquoise: "#2dd4bf",
  violet: "#c084fc",
};

export const CORES = ORB_COLORS;

/** Cor do agente; sem escolha, a mesma cor estável que o orbe usaria. */
export const corDoAgente = (a: { id: string; cor?: AvatarColor }) => COR_TERMINAL[a.cor ?? defaultOrbColor(a.id)];

/** "#a78bfa" → "rgba(167,139,250,.35)" */
export function comAlfa(hex: string, alfa: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/** Sequência ANSI de cor de texto em 24 bits, para o prompt do terminal. */
export function ansi(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
}
