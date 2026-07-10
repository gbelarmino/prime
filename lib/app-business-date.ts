/** Fuso civil do negócio Aires (alinhado a aires.app.timezone na API). */
export const APP_BUSINESS_TIMEZONE = "America/Sao_Paulo";

/** Data civil YYYY-MM-DD no fuso de negócio — evita deslocamento de `toISOString()` (UTC). */
export function civilDateIsoInTimeZone(
  date: Date,
  timeZone: string = APP_BUSINESS_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hojeNegocioIso(): string {
  return civilDateIsoInTimeZone(new Date());
}

/** Soma dias civis a partir de uma data ISO (meio-dia local evita DST). */
export function addDiasIso(iso: string, dias: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
