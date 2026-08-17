/**
 * Helpers para as notificações de cobrança de um título, que hoje somam dois canais com
 * vocabulários de status distintos: SMS (fila local + TextBee) e WhatsApp (fila local + Twilio).
 */

import type {
  TituloNotificacao,
  TituloNotificacaoCanal,
  TituloSmsNotificacaoResumo,
  TituloWhatsAppNotificacaoResumo,
} from "@/lib/fin-service";
import { WHATSAPP_FILA_STATUS_TONES } from "@/lib/dashboard-datatable";
import {
  SMS_FILA_STATUS_TONES,
  smsFilaStatusBadgeLabel,
  smsFilaStatusTone,
} from "@/lib/sms-fila-status";

export const TITULO_NOTIFICACAO_CANAL_LABELS: Record<TituloNotificacaoCanal, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
};

/** Fila WhatsApp: PENDENTE/ENVIANDO locais, SUCESSO/ERRO vindos do webhook Twilio. */
const WHATSAPP_FILA_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIANDO: "Enviando",
  SUCESSO: "Enviado",
  ERRO: "Falhou",
  CANCELADO: "Cancelado",
  // legado
  ENVIADO: "Enviado",
};

const TONE_AGENDADO = "border-violet-500/25 bg-violet-500/15 text-violet-300";
const TONE_FALLBACK = "border-white/10 bg-white/10 text-white/50";

/** Chip do canal na coluna de status da listagem. */
export const TITULO_NOTIFICACAO_CANAL_TONES: Record<TituloNotificacaoCanal, string> = {
  SMS: "border-white/10 bg-white/[0.04] text-white/70",
  WHATSAPP: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200/80",
};

/** PENDENTE com agendamento no futuro é "Agendado", não "Pendente". */
function agendadoNoFuturo(status: string, dataAgendada?: string | null): boolean {
  return (
    status === "PENDENTE" &&
    !!dataAgendada &&
    new Date(dataAgendada).getTime() > Date.now()
  );
}

function whatsappStatusBadgeLabel(status: string, dataAgendada?: string | null): string {
  if (agendadoNoFuturo(status, dataAgendada)) return "Agendado";
  return WHATSAPP_FILA_STATUS_LABELS[status] ?? status;
}

function whatsappStatusTone(status: string, dataAgendada?: string | null): string {
  if (agendadoNoFuturo(status, dataAgendada)) return TONE_AGENDADO;
  return WHATSAPP_FILA_STATUS_TONES[status] ?? TONE_FALLBACK;
}

export function notificacaoStatusBadgeLabel(
  canal: TituloNotificacaoCanal,
  status: string,
  dataAgendada?: string | null,
): string {
  return canal === "WHATSAPP"
    ? whatsappStatusBadgeLabel(status, dataAgendada)
    : smsFilaStatusBadgeLabel(status, dataAgendada);
}

export function notificacaoStatusTone(
  canal: TituloNotificacaoCanal,
  status: string,
  dataAgendada?: string | null,
): string {
  return canal === "WHATSAPP"
    ? whatsappStatusTone(status, dataAgendada)
    : smsFilaStatusTone(status, dataAgendada);
}

/** Mapa de tons do canal, para `dashboardStatusBadge` no modal. */
export function notificacaoStatusTones(
  canal: TituloNotificacaoCanal,
): Record<string, string> {
  return canal === "WHATSAPP" ? WHATSAPP_FILA_STATUS_TONES : SMS_FILA_STATUS_TONES;
}

/** Chip do badge: identidade estável entre canais, já que os ids são por fila. */
export type TituloNotificacaoChip = {
  key: string;
  canal: TituloNotificacaoCanal;
  id: number;
  status: string;
  dataAgendada: string;
  dataEnvio?: string | null;
};

/**
 * Chips do badge agrupados por canal (SMS e depois WhatsApp), cada grupo na ordem de
 * enfileiramento. Os resumos não trazem `dataCriacao`, então a ordem cronológica entre canais só é
 * possível no modal — aqui o agrupamento por canal é o que mantém a leitura previsível.
 */
export function notificacaoChips(
  sms: TituloSmsNotificacaoResumo[] | undefined,
  whatsapp: TituloWhatsAppNotificacaoResumo[] | undefined,
): TituloNotificacaoChip[] {
  const porId = (a: { id: number }, b: { id: number }) => a.id - b.id;
  return [
    ...[...(sms ?? [])].sort(porId).map((item) => ({
      key: `SMS-${item.id}`,
      canal: "SMS" as const,
      ...item,
    })),
    ...[...(whatsapp ?? [])].sort(porId).map((item) => ({
      key: `WHATSAPP-${item.id}`,
      canal: "WHATSAPP" as const,
      ...item,
    })),
  ];
}

export function notificacaoKey(item: TituloNotificacao): string {
  return `${item.canal}-${item.id}`;
}
