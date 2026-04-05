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
