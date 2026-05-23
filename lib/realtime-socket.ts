"use client";

import { getNotificacaoWsUrl } from "@/lib/api-config";

export type RealtimeMessage = Record<string, unknown> & { type?: string };

type Listener = (message: RealtimeMessage) => void;

let ws: WebSocket | null = null;
const listeners = new Set<Listener>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;

function connect() {
  const url = getNotificacaoWsUrl();
  if (!url) return;
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    return;
  }

  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as RealtimeMessage;
      if (data.type === "PING") return;
      listeners.forEach((listener) => listener(data));
    } catch {
      // payload inválido — ignora
    }
  };

  ws.onclose = () => {
    ws = null;
    if (subscriberCount > 0) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

/** Uma única conexão WebSocket partilhada por notificações, fila WhatsApp, etc. */
export function subscribeRealtime(listener: Listener): () => void {
  subscriberCount += 1;
  listeners.add(listener);
  connect();

  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
    }
  };
}
