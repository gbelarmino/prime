"use client";

import { useCallback, useEffect, useState } from "react";
import { getTenantId } from "@/lib/auth-storage";
import { contagemChamadosAbertos } from "@/lib/chamados-service";
import { isChamadosAbertosEvent } from "@/lib/chamados-realtime";
import { subscribeRealtime } from "@/lib/realtime-socket";

export const ATENDIMENTO_CHAMADOS_PATH = "/dashboard/atendimento/chamados";

/** Atualização imediata na mesma aba (ex.: após listar/alterar status). */
export const CHAMADOS_ABERTOS_EVENT = "chamados-abertos-changed";

export function notifyChamadosAbertosChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAMADOS_ABERTOS_EVENT));
  }
}

/**
 * Contagem de chamados abertos no menu.
 * Fetch inicial + WebSocket `CHAMADOS_ABERTOS` + evento local na mesma aba.
 * Não usar polling — ver `.cursor/rules/realtime-websocket.mdc`.
 */
export function useChamadosAbertos(enabled: boolean) {
  const [abertos, setAbertos] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAbertos(0);
      return;
    }
    try {
      const { abertos: count } = await contagemChamadosAbertos({ skipLoading: true });
      setAbertos(count);
    } catch {
      setAbertos(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setAbertos(0);
      return;
    }

    void refresh();

    const onLocalRefresh = () => void refresh();
    window.addEventListener(CHAMADOS_ABERTOS_EVENT, onLocalRefresh);

    const unsubscribeWs = subscribeRealtime((data) => {
      if (!isChamadosAbertosEvent(data)) return;
      const localTenantId = getTenantId();
      if (localTenantId != null && data.tenantId !== localTenantId) return;
      setAbertos(data.abertos);
    });

    return () => {
      window.removeEventListener(CHAMADOS_ABERTOS_EVENT, onLocalRefresh);
      unsubscribeWs();
    };
  }, [enabled, refresh]);

  return { abertos, refresh };
}
