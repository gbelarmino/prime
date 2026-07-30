"use client";

import { useCallback, useEffect, useState } from "react";
import { contagemChamadosAbertos } from "@/lib/chamados-service";

export const ATENDIMENTO_CHAMADOS_PATH = "/dashboard/atendimento/chamados";

/** Atualização imediata na mesma aba (ex.: após listar/alterar status). */
export const CHAMADOS_ABERTOS_EVENT = "chamados-abertos-changed";

export function notifyChamadosAbertosChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAMADOS_ABERTOS_EVENT));
  }
}

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

    const interval = window.setInterval(() => void refresh(), 60_000);

    return () => {
      window.removeEventListener(CHAMADOS_ABERTOS_EVENT, onLocalRefresh);
      window.clearInterval(interval);
    };
  }, [enabled, refresh]);

  return { abertos, refresh };
}
