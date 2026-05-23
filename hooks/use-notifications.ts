"use client";

import { useEffect } from "react";
import { isAdmin } from "@/lib/auth-storage";
import { getNotificacaoUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { useNotificationsStore, Notificacao } from "@/lib/notifications-store";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { toast } from "sonner";

function isNotificacaoPayload(data: unknown): data is Notificacao {
  if (typeof data !== "object" || data === null) return false;
  const row = data as Record<string, unknown>;
  return (
    typeof row.id === "number" &&
    typeof row.titulo === "string" &&
    typeof row.mensagem === "string"
  );
}

export function useNotifications() {
  const { addNotification, setNotifications } = useNotificationsStore();

  useEffect(() => {
    if (!isAdmin()) return;

    const url = getNotificacaoUrl();
    if (!url) return;

    apiFetch(url, { skipLoading: true })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => console.error("Erro ao carregar notificações", err));

    return subscribeRealtime((data) => {
      if (!isNotificacaoPayload(data)) return;

      addNotification(data);

      toast.info(data.titulo, {
        description: data.mensagem,
        duration: 10000,
      });

      const audio = new Audio("/sounds/notification.mp3");
      audio.play().catch(() => {});
    });
  }, [addNotification, setNotifications]);
}
