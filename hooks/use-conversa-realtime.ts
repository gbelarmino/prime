"use client";

import { useEffect, useState } from "react";
import { subscribeRealtime } from "@/lib/realtime-socket";

/** Reage a MSG_RECEBIDA / MSG_ENVIADA / CONVERSA_ATUALIZADA no WebSocket. */
export function useConversaRealtime(onEvent: () => void) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribeRealtime((msg) => {
      const type = typeof msg.type === "string" ? msg.type : "";
      if (
        type === "MSG_RECEBIDA" ||
        type === "MSG_ENVIADA" ||
        type === "CONVERSA_ATUALIZADA"
      ) {
        setTick((t) => t + 1);
        onEvent();
      }
    });
  }, [onEvent]);

  return tick;
}
