import type { RealtimeMessage } from "@/lib/realtime-socket";

export const RENEGOCIACAO_ASSINATURA_WS_TYPE = "RENEGOCIACAO_ASSINATURA";

export type RenegociacaoAssinaturaWsEvent = {
  type: typeof RENEGOCIACAO_ASSINATURA_WS_TYPE;
  tenantId: number;
  renegociacaoId: number;
  statusDocumento: string;
  ultimoEvento: string | null;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function isRenegociacaoAssinaturaEvent(
  data: RealtimeMessage,
): data is RenegociacaoAssinaturaWsEvent {
  if (data.type !== RENEGOCIACAO_ASSINATURA_WS_TYPE) return false;
  const tenantId = coerceFiniteNumber(data.tenantId);
  const renegociacaoId = coerceFiniteNumber(data.renegociacaoId);
  return tenantId != null && renegociacaoId != null && typeof data.statusDocumento === "string";
}
