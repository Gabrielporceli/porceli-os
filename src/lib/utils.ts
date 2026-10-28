import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatToJID(phone: string): string {
  // Remove non-numeric characters
  const clean = phone.replace(/\D/g, "");
  if (!clean) return "";
  // Ensure it has the @s.whatsapp.net suffix
  return `${clean}@s.whatsapp.net`;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Lê um valor digitado em reais ("R$ 1.500,00", "1500,5", "1500") como número.
 *
 * O ponto é separador de MILHAR e a vírgula, de centavos. A versão que existia
 * espalhada pelos modais trocava a vírgula por ponto sem antes tirar o ponto
 * do milhar: "1.500,00" virava "1.500.00", que o parseFloat lê como 1.5 —
 * todo valor a partir de R$ 1.000 era salvo dividido por mil.
 */
export function lerMoeda(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpo = texto.replace(/[^\d,-]/g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}
