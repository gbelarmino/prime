"use client";

import { useEffect } from "react";
import { subscribeRealtime } from "@/lib/realtime-socket";
import {
  isWhatsAppFilaWsEvent,
  type WhatsAppFilaWsEvent,
} from "@/lib/whatsapp-fila-realtime";

export function useWhatsAppFilaRealtime(
  onEvent: (event: WhatsAppFilaWsEvent) => void,
) {
  useEffect(() => {
    return subscribeRealtime((data) => {
      if (!isWhatsAppFilaWsEvent(data)) return;
      onEvent(data);
    });
  }, [onEvent]);
}
