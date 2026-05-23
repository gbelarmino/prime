"use client";

import { useCallback, useEffect, useState } from "react";
import { finService } from "@/lib/fin-service";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { isUnicredWebhookPendentesEvent } from "@/lib/unicred-webhook-realtime";

export const FIN_UNICRED_WEBHOOKS_PATH = "/dashboard/financeiro/unicred-webhooks";

/** Atualização imediata na mesma aba (ex.: após listar na página de conciliação). */
export const UNICRED_WEBHOOKS_PENDENTES_EVENT = "unicred-webhooks-pendentes-changed";

export function notifyUnicredWebhookPendentesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNICRED_WEBHOOKS_PENDENTES_EVENT));
  }
}

export function useUnicredWebhookPendentes(enabled: boolean) {
  const [pendentes, setPendentes] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPendentes(0);
      return;
    }
    try {
      const { pendentes: count } = await finService.contagemUnicredWebhookPendentes({
        skipLoading: true,
      });
      setPendentes(count);
    } catch {
      setPendentes(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPendentes(0);
      return;
    }

    void refresh();

    const onLocalRefresh = () => void refresh();
    window.addEventListener(UNICRED_WEBHOOKS_PENDENTES_EVENT, onLocalRefresh);

    const unsubscribeWs = subscribeRealtime((data) => {
      if (!isUnicredWebhookPendentesEvent(data)) return;
      setPendentes(data.pendentes);
    });

    return () => {
      window.removeEventListener(UNICRED_WEBHOOKS_PENDENTES_EVENT, onLocalRefresh);
      unsubscribeWs();
    };
  }, [enabled, refresh]);

  return { pendentes, refresh };
}
