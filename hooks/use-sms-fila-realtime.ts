"use client";

import { useEffect } from "react";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { isSmsFilaWsEvent, type SmsFilaWsEvent } from "@/lib/sms-fila-realtime";

export function useSmsFilaRealtime(onEvent: (event: SmsFilaWsEvent) => void) {
  useEffect(() => {
    return subscribeRealtime((data) => {
      if (!isSmsFilaWsEvent(data)) return;
      onEvent(data);
    });
  }, [onEvent]);
}
