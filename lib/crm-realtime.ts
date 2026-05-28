export type CrmKanbanWsEventType = "CRM_KANBAN_UPDATED";

export type CrmKanbanWsEvent = {
  type: CrmKanbanWsEventType;
  tenantId: number;
  leadId: number | null;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseCrmKanbanWsEvent(
  data: Record<string, unknown>,
): CrmKanbanWsEvent | null {
  if (data.type !== "CRM_KANBAN_UPDATED") return null;
  const tenantId = coerceFiniteNumber(data.tenantId);
  if (tenantId == null) return null;
  const rawLeadId = data.leadId;
  const leadId =
    rawLeadId == null || rawLeadId === undefined
      ? null
      : coerceFiniteNumber(rawLeadId);
  if (rawLeadId != null && rawLeadId !== undefined && leadId == null) {
    return null;
  }
  return { type: "CRM_KANBAN_UPDATED", tenantId, leadId };
}

export function isCrmKanbanWsEvent(
  data: Record<string, unknown>,
): data is CrmKanbanWsEvent {
  return parseCrmKanbanWsEvent(data) != null;
}
