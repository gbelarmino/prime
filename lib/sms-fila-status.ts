/** Status da fila SMS — locais (anti-ban) + TextBee (webhook). */

export const SMS_FILA_STATUS = {
  PENDENTE: "PENDENTE",
  ENVIANDO: "ENVIANDO",
  CANCELADO: "CANCELADO",
  PENDING: "pending",
  DISPATCHED: "dispatched",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  UNKNOWN: "unknown",
} as const;

export type SmsFilaStatusCode = (typeof SMS_FILA_STATUS)[keyof typeof SMS_FILA_STATUS];

export const SMS_FILA_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Pendente (fila)", value: SMS_FILA_STATUS.PENDENTE },
  { label: "Enviando", value: SMS_FILA_STATUS.ENVIANDO },
  { label: "Pending (TextBee)", value: SMS_FILA_STATUS.PENDING },
  { label: "Dispatched", value: SMS_FILA_STATUS.DISPATCHED },
  { label: "Sent", value: SMS_FILA_STATUS.SENT },
  { label: "Delivered", value: SMS_FILA_STATUS.DELIVERED },
  { label: "Failed", value: SMS_FILA_STATUS.FAILED },
  { label: "Unknown", value: SMS_FILA_STATUS.UNKNOWN },
  { label: "Cancelado", value: SMS_FILA_STATUS.CANCELADO },
];

export const SMS_FILA_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIANDO: "Enviando",
  pending: "Na fila (TextBee)",
  dispatched: "Despachado",
  sent: "Enviado",
  delivered: "Entregue",
  failed: "Falhou",
  unknown: "Incerto",
  CANCELADO: "Cancelado",
  // legado (pré-migração)
  ENVIADO: "Enviado",
  SUCESSO: "Entregue",
  ERRO: "Falhou",
};

/** Rótulo curto para badges compactos na listagem de títulos. */
export const SMS_FILA_STATUS_BADGE_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIANDO: "Enviando",
  pending: "Fila TB",
  dispatched: "Despachado",
  sent: "Enviado",
  delivered: "Entregue",
  failed: "Falhou",
  unknown: "Incerto",
  CANCELADO: "Cancelado",
  ENVIADO: "Enviado",
  SUCESSO: "Entregue",
  ERRO: "Falhou",
};

export const SMS_FILA_STATUS_TONES: Record<string, string> = {
  PENDENTE: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  ENVIANDO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  pending: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  dispatched: "border-indigo-500/25 bg-indigo-500/15 text-indigo-300",
  sent: "border-sky-500/25 bg-sky-500/15 text-sky-300",
  delivered: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  failed: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  unknown: "border-white/15 bg-white/10 text-white/45",
  CANCELADO: "border-white/15 bg-white/10 text-white/45",
  ENVIADO: "border-sky-500/25 bg-sky-500/15 text-sky-300",
  SUCESSO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  ERRO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

export function smsFilaStatusLabel(status: string): string {
  return SMS_FILA_STATUS_LABELS[status] ?? status;
}

  /** Rótulo do badge; distingue agendamento futuro de pendente na fila. */
export function smsFilaStatusBadgeLabel(status: string, dataAgendada?: string | null): string {
  if (
    status === SMS_FILA_STATUS.PENDENTE &&
    dataAgendada &&
    new Date(dataAgendada).getTime() > Date.now()
  ) {
    return "Agendado";
  }
  return SMS_FILA_STATUS_BADGE_LABELS[status] ?? smsFilaStatusLabel(status);
}

export function smsFilaStatusTone(status: string, dataAgendada?: string | null): string {
  if (
    status === SMS_FILA_STATUS.PENDENTE &&
    dataAgendada &&
    new Date(dataAgendada).getTime() > Date.now()
  ) {
    return "border-violet-500/25 bg-violet-500/15 text-violet-300";
  }
  return SMS_FILA_STATUS_TONES[status] ?? "border-white/10 bg-white/10 text-white/50";
}

export function canReprocessarSmsFila(status: string): boolean {
  return (
    status === SMS_FILA_STATUS.PENDENTE ||
    status === SMS_FILA_STATUS.PENDING ||
    status === SMS_FILA_STATUS.DISPATCHED ||
    status === SMS_FILA_STATUS.SENT ||
    status === SMS_FILA_STATUS.FAILED ||
    status === SMS_FILA_STATUS.UNKNOWN ||
    status === "ERRO" ||
    status === "ENVIADO"
  );
}

export function canCancelarSmsFila(status: string): boolean {
  return canReprocessarSmsFila(status);
}
