import type { WhatsAppFilaItem } from "@/lib/whatsapp-service";
import type { SpringPage } from "@/lib/spring-page";

export type WhatsAppFilaWsEventType = "WHATSAPP_FILA_CREATED" | "WHATSAPP_FILA_UPDATED";

export type WhatsAppFilaWsEvent = {
  type: WhatsAppFilaWsEventType;
  item: WhatsAppFilaItem;
};

export function isWhatsAppFilaWsEvent(
  data: Record<string, unknown>,
): data is WhatsAppFilaWsEvent {
  const type = data.type;
  if (type !== "WHATSAPP_FILA_CREATED" && type !== "WHATSAPP_FILA_UPDATED") {
    return false;
  }
  const item = data.item;
  return typeof item === "object" && item !== null && "id" in item;
}

function matchesStatusFilter(statusFilter: string, itemStatus: string): boolean {
  return !statusFilter || statusFilter === itemStatus;
}

/** Aplica evento WS à página atual da tabela (sem refetch). */
export function applyWhatsAppFilaRealtime(
  prev: SpringPage<WhatsAppFilaItem> | null,
  event: WhatsAppFilaWsEvent,
  opts: { statusFilter: string; page: number; pageSize: number },
): SpringPage<WhatsAppFilaItem> | null {
  if (!prev) return prev;

  const { item } = event;
  const matches = matchesStatusFilter(opts.statusFilter, item.status);
  const idx = prev.content.findIndex((row) => row.id === item.id);

  if (event.type === "WHATSAPP_FILA_UPDATED") {
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

  // WHATSAPP_FILA_CREATED
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
