"use client";

import { useEffect } from "react";
import { subscribeRealtime } from "@/lib/realtime-socket";

/** Mantém a conexão WebSocket partilhada ativa enquanto o utilizador está no dashboard. */
export function useRealtimeSocketKeeper(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return subscribeRealtime(() => {
      /* ouvintes específicos tratam cada tipo de evento */
    });
  }, [enabled]);
}
