import type { SmsFilaItem } from "@/lib/sms-service";
import type { SpringPage } from "@/lib/spring-page";

export type { SmsFilaItem };

export type SmsFilaWsEventType = "SMS_FILA_CREATED" | "SMS_FILA_UPDATED";

type SmsFilaWsItemRaw = {
  id: number;
  telefone?: string;
  mensagem?: string;
  destinatario?: string;
  corpo?: string;
  status: string;
  tentativas?: number | null;
  dataAgendada?: string | null;
  dataEnvio?: string | null;
  dataCriacao?: string | null;
  erro?: string | null;
  externalId?: string | null;
  externalSmsId?: string | null;
  tituloCobrancaId?: string | null;
  tituloIds?: string[] | null;
};

export type SmsFilaWsEvent = {
  type: SmsFilaWsEventType;
  item: SmsFilaWsItemRaw;
};

export function normalizeSmsFilaItem(raw: SmsFilaWsItemRaw): SmsFilaItem {
  return {
    id: raw.id,
    telefone: raw.telefone ?? raw.destinatario ?? "",
    mensagem: raw.mensagem ?? raw.corpo ?? "",
    status: raw.status,
    tentativas: raw.tentativas ?? 0,
    dataAgendada: raw.dataAgendada ?? "",
    dataEnvio: raw.dataEnvio ?? null,
    dataCriacao: raw.dataCriacao ?? "",
    erro: raw.erro ?? null,
    externalId: raw.externalId ?? null,
    externalSmsId: raw.externalSmsId ?? null,
    tituloCobrancaId: raw.tituloCobrancaId ?? null,
    tituloIds: raw.tituloIds ?? null,
  };
}

export function isSmsFilaWsEvent(data: Record<string, unknown>): data is SmsFilaWsEvent {
  const type = data.type;
  if (type !== "SMS_FILA_CREATED" && type !== "SMS_FILA_UPDATED") {
    return false;
  }
  const item = data.item;
  return typeof item === "object" && item !== null && "id" in item;
}

function matchesStatusFilter(statusFilter: string, itemStatus: string): boolean {
  return !statusFilter || statusFilter === itemStatus;
}

/** Aplica evento WS à página atual da tabela (sem refetch). */
export function applySmsFilaRealtime(
  prev: SpringPage<SmsFilaItem> | null,
  event: SmsFilaWsEvent,
  opts: { statusFilter: string; page: number; pageSize: number },
): SpringPage<SmsFilaItem> | null {
  if (!prev) return prev;

  const item = normalizeSmsFilaItem(event.item);
  const matches = matchesStatusFilter(opts.statusFilter, item.status);
  const idx = prev.content.findIndex((row) => row.id === item.id);

  if (event.type === "SMS_FILA_UPDATED") {
    if (idx >= 0) {
      if (!matches) {
        return {
          ...prev,
          content: prev.content.filter((row) => row.id !== item.id),
          totalElements: Math.max(0, prev.totalElements - 1),
        };
      }
      const content = [...prev.content];
      content[idx] = item;
      return { ...prev, content };
    }
    return prev;
  }

  if (idx >= 0) {
    if (!matches) return prev;
    const content = [...prev.content];
    content[idx] = item;
    return { ...prev, content };
  }

  if (!matches) {
    return { ...prev, totalElements: prev.totalElements + 1 };
  }

  if (opts.page !== 0) {
    return { ...prev, totalElements: prev.totalElements + 1 };
  }

  const content = [item, ...prev.content];
  if (content.length > opts.pageSize) {
    content.length = opts.pageSize;
  }
  return {
    ...prev,
    content,
    totalElements: prev.totalElements + 1,
  };
}
