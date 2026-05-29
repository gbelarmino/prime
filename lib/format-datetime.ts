/** Fuso de negócio Aires (alinhado a `aires.app.timezone` na API). */
export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

/**
 * A API serializa `LocalDateTime` sem offset — valor já está em horário de São Paulo.
 * Strings com `Z` ou offset explícito são interpretadas normalmente.
 */
export function parseBusinessDateTime(iso: string): Date {
  const trimmed = iso.trim();
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`;
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)/);
  if (!match) {
    return new Date(trimmed);
  }
  const wallClock = match[1];
  const utcMs = Date.parse(`${wallClock}Z`);
  const offsetMinutes = businessTimezoneOffsetMinutes(new Date(utcMs));
  return new Date(utcMs - offsetMinutes * 60_000);
}

/** Offset de BUSINESS_TIMEZONE em minutos (positivo = à frente de UTC). */
function businessTimezoneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  const hours = Number(m[2]);
  const minutes = Number(m[3] ?? "0");
  return sign * (hours * 60 + minutes);
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
