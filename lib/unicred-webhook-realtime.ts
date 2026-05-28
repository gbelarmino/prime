import type { RealtimeMessage } from "@/lib/realtime-socket";

export const UNICRED_WEBHOOK_PENDENTES_WS_TYPE = "UNICRED_WEBHOOK_PENDENTES";

export type UnicredWebhookPendentesWsEvent = {
  type: typeof UNICRED_WEBHOOK_PENDENTES_WS_TYPE;
  tenantId: number;
  pendentes: number;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function isUnicredWebhookPendentesEvent(
  data: RealtimeMessage,
): data is UnicredWebhookPendentesWsEvent {
  if (data.type !== UNICRED_WEBHOOK_PENDENTES_WS_TYPE) return false;
  const pendentes = coerceFiniteNumber(data.pendentes);
  const tenantId = coerceFiniteNumber(data.tenantId);
  return pendentes != null && pendentes >= 0 && tenantId != null;
}
