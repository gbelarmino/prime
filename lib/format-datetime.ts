/** Fuso de negócio Aires (alinhado a `aires.app.timezone` na API). */
export const BUSINESS_TIMEZONE = "America/Fortaleza";

/**
 * A API serializa `LocalDateTime` sem offset — valor já está em horário de Fortaleza.
 * Strings com `Z` ou offset explícito são interpretadas normalmente.
 */
export function parseBusinessDateTime(iso: string): Date {
  const trimmed = iso.trim();
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`;
  return new Date(`${normalized}-03:00`);
}

export function formatBusinessDateTime(
  iso: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  try {
    return parseBusinessDateTime(iso).toLocaleString("pt-BR", {
      timeZone: BUSINESS_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    });
  } catch {
    return iso;
  }
}

/** Data/hora com segundos (fila WhatsApp, logs). */
export function formatBusinessDateTimeWithSeconds(iso: string | null | undefined): string {
  return formatBusinessDateTime(iso, { second: "2-digit" });
}
