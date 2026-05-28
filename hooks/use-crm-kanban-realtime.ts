"use client";

import { useEffect } from "react";
import { getTenantId } from "@/lib/auth-storage";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { parseCrmKanbanWsEvent, type CrmKanbanWsEvent } from "@/lib/crm-realtime";

export function useCrmKanbanRealtime(onUpdated: (event: CrmKanbanWsEvent) => void) {
  useEffect(() => {
    return subscribeRealtime((data) => {
      const event = parseCrmKanbanWsEvent(data);
      if (!event) return;

      const localTenantId = getTenantId();
      if (localTenantId != null && event.tenantId !== localTenantId) {
        return;
      }

      onUpdated(event);
    });
  }, [onUpdated]);
}
