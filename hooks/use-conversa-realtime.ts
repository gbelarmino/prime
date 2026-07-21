"use client";

import { useEffect, useState } from "react";
import { subscribeRealtime, type RealtimeMessage } from "@/lib/realtime-socket";

type Options = {
  /** Se definido, recebe o evento bruto (útil para patch de MSG_STATUS). */
  onMessage?: (msg: RealtimeMessage) => void;
  /**
   * Filtra por canal (`SMS` | `WHATSAPP`). Eventos sem `canal` são tratados
   * como WhatsApp (legado). Quando definido, ignora eventos de outro canal.
   */
  canal?: string;
};

function eventCanal(msg: RealtimeMessage): string {
  const raw = typeof msg.canal === "string" ? msg.canal.trim() : "";
  return (raw || "WHATSAPP").toUpperCase();
}

/** Reage a MSG_RECEBIDA / MSG_ENVIADA / MSG_STATUS / CONVERSA_ATUALIZADA no WebSocket. */
export function useConversaRealtime(onEvent: () => void, options?: Options) {
  const [tick, setTick] = useState(0);
  const onMessage = options?.onMessage;
  const canalWanted = options?.canal?.trim().toUpperCase() || null;

  useEffect(() => {
    return subscribeRealtime((msg) => {
      const type = typeof msg.type === "string" ? msg.type : "";
      if (
        type === "MSG_RECEBIDA" ||
        type === "MSG_ENVIADA" ||
        type === "MSG_STATUS" ||
        type === "CONVERSA_ATUALIZADA"
      ) {
        if (canalWanted && eventCanal(msg) !== canalWanted) return;
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
  }, [onEvent, onMessage, canalWanted]);

  return tick;
}
