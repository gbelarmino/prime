"use client";

import { getAuthToken, getTenantId, isStaffTokenUsable } from "@/lib/auth-storage";
import { getNotificacaoWsUrl } from "@/lib/api-config";

export type RealtimeMessage = Record<string, unknown> & { type?: string };

type Listener = (message: RealtimeMessage) => void;

let ws: WebSocket | null = null;
const listeners = new Set<Listener>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;
/** Evita reconectar em loop com o mesmo token rejeitado no handshake. */
let lastRejectedToken: string | null = null;

function buildWsUrl(): string {
  const base = getNotificacaoWsUrl();
  if (!base) return "";

  const token = getAuthToken();
  if (!isStaffTokenUsable(token)) return "";
  if (token === lastRejectedToken) return "";

  const params = new URLSearchParams();
  params.set("token", token!);
  const tenantId = getTenantId();
  if (tenantId != null) {
    params.set("tenantId", String(tenantId));
  }
  return `${base}?${params.toString()}`;
}

function scheduleReconnect() {
  if (reconnectTimer || subscriberCount <= 0) return;
  if (!isStaffTokenUsable(getAuthToken())) return;
  if (getAuthToken() === lastRejectedToken) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5000);
}

function connect() {
  const token = getAuthToken();
  const url = buildWsUrl();
  if (!url || !token) return;
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    return;
  }

  let opened = false;
  ws = new WebSocket(url);

  ws.onopen = () => {
    opened = true;
    lastRejectedToken = null;
  };

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
    if (!opened && token) {
      lastRejectedToken = token;
    }
    scheduleReconnect();
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

/** Limpa bloqueio após novo login (token diferente). */
export function resetRealtimeSocketAuthBlock(): void {
  lastRejectedToken = null;
}
