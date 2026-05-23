/**
 * Moeda no padrão brasileiro:
 * - milhares: separador **.** (ponto)
 * - decimais: separador **,** (vírgula), sempre 2 casas
 *
 * A digitação mascarada interpreta dígitos como centavos acumulados → ex.: "1.234,56".
 * {@link parseMoneyBrl} reverte para número ao enviar à API.
 */

const MAX_DIGITS = 15;

/**
 * Formata valor em reais: `1.234.567,89` (ponto milhar, vírgula decimal).
 */
export function formatReaisBrl(reais: number): string {
  if (!Number.isFinite(reais)) return "";
  const negative = reais < 0;
  const abs = Math.abs(reais);
  const [intRaw, frac = "00"] = abs.toFixed(2).split(".");
  const intPart = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = `${intPart},${frac}`;
  return negative ? `-${body}` : body;
}

/** Remove não-dígitos e limita o tamanho (valor em centavos como inteiro). */
export function sanitizeMoneyDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

/** Formata sequência de dígitos interpretada como centavos (ex.: "1234567" → "12.345,67"). */
export function formatDigitsAsBrl(digits: string): string {
  const d = sanitizeMoneyDigits(digits);
  if (!d) return "";
  const cents = parseInt(d, 10);
  if (!Number.isFinite(cents)) return "";
  const reais = cents / 100;
  return formatReaisBrl(reais);
}

/** Converte número da API (decimal) para o texto exibido no campo mascarado. */
export function numberToBrlInputValue(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const cents = Math.round(n * 100);
  if (cents < 0) return "";
  return formatDigitsAsBrl(String(Math.min(cents, 10 ** MAX_DIGITS - 1)));
}

/**
 * Interpreta string no padrão BR (milhares com ".", decimal com ",") como número.
 * Ex.: "1.234,56" → 1234.56 ; "1234,56" → 1234.56
 */
export function parseMoneyBrl(s: string | undefined): number | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const noThousands = t.replace(/\./g, "");
  const normalized = noThousands.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
