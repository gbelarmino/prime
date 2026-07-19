/** Evento global para atualizar o saldo Twilio no header após envios. */

export const TWILIO_SALDO_REFRESH_EVENT = "aires:twilio-saldo-refresh";

export function requestTwilioSaldoRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TWILIO_SALDO_REFRESH_EVENT));
}

export function subscribeTwilioSaldoRefresh(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener(TWILIO_SALDO_REFRESH_EVENT, fn);
  return () => window.removeEventListener(TWILIO_SALDO_REFRESH_EVENT, fn);
}
