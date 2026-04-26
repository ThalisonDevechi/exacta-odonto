/**
 * WhatsApp manual messaging utilities.
 * Builds wa.me links — no official API integration in this phase.
 */

/** Strips non-digits and ensures Brazilian DDI (55) prefix. */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Default to Brazil DDI 55
  return `55${digits}`;
}

export function isValidWhatsAppPhone(phone: string | null | undefined): boolean {
  const n = normalizePhone(phone);
  // 55 + DDD(2) + number(8 or 9) = 12 or 13 digits
  return n.length >= 12 && n.length <= 14;
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const n = normalizePhone(phone);
  const text = encodeURIComponent(message ?? "");
  if (!n) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${n}?text=${text}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string): void {
  const url = buildWhatsAppLink(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}
