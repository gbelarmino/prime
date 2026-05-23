import type { RealtimeMessage } from "@/lib/realtime-socket";

export const UNICRED_WEBHOOK_PENDENTES_WS_TYPE = "UNICRED_WEBHOOK_PENDENTES";

export type UnicredWebhookPendentesWsEvent = {
  type: typeof UNICRED_WEBHOOK_PENDENTES_WS_TYPE;
  pendentes: number;
};

export function isUnicredWebhookPendentesEvent(
  data: RealtimeMessage,
): data is UnicredWebhookPendentesWsEvent {
  if (data.type !== UNICRED_WEBHOOK_PENDENTES_WS_TYPE) return false;
  const pendentes = data.pendentes;
  return typeof pendentes === "number" && Number.isFinite(pendentes) && pendentes >= 0;
}
