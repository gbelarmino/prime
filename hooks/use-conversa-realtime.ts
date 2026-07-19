"use client";

import { useEffect, useState } from "react";
import { subscribeRealtime, type RealtimeMessage } from "@/lib/realtime-socket";

type Options = {
  /** Se definido, recebe o evento bruto (útil para patch de MSG_STATUS). */
  onMessage?: (msg: RealtimeMessage) => void;
};

/** Reage a MSG_RECEBIDA / MSG_ENVIADA / MSG_STATUS / CONVERSA_ATUALIZADA no WebSocket. */
export function useConversaRealtime(onEvent: () => void, options?: Options) {
  const [tick, setTick] = useState(0);
  const onMessage = options?.onMessage;

  useEffect(() => {
    return subscribeRealtime((msg) => {
      const type = typeof msg.type === "string" ? msg.type : "";
      if (
        type === "MSG_RECEBIDA" ||
        type === "MSG_ENVIADA" ||
        type === "MSG_STATUS" ||
        type === "CONVERSA_ATUALIZADA"
      ) {
        onMessage?.(msg);
        if (type === "MSG_STATUS") {
          // Status: só patch local; evita reload completo da thread.
          setTick((t) => t + 1);
          return;
        }
        setTick((t) => t + 1);
        onEvent();
      }
    });
  }, [onEvent, onMessage]);

  return tick;
}
