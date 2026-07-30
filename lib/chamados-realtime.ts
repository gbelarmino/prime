import type { RealtimeMessage } from "@/lib/realtime-socket";

export const CHAMADOS_ABERTOS_WS_TYPE = "CHAMADOS_ABERTOS";

export type ChamadosAbertosWsEvent = {
  type: typeof CHAMADOS_ABERTOS_WS_TYPE;
  tenantId: number;
  abertos: number;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function isChamadosAbertosEvent(data: RealtimeMessage): data is ChamadosAbertosWsEvent {
  if (data.type !== CHAMADOS_ABERTOS_WS_TYPE) return false;
  const abertos = coerceFiniteNumber(data.abertos);
  const tenantId = coerceFiniteNumber(data.tenantId);
  return abertos != null && abertos >= 0 && tenantId != null;
}
