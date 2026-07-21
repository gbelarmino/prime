"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { subscribeRealtime } from "@/lib/realtime-socket";
import {
  isWhatsAppAlertMuted,
  notifyWhatsAppInboundVisual,
  playWhatsAppInboundChime,
  setWhatsAppAlertMuted,
  unlockWhatsAppAlertAudio,
} from "@/lib/whatsapp-inbound-alert";
import { cn } from "@/lib/utils";

const WA_CHAT_HREF = "/dashboard/atendimento/chat";
const SMS_CHAT_HREF = "/dashboard/atendimento/sms";

function openChatInNewTab(href: string, conversaId: string | null) {
  const q = conversaId ? `?conversa=${conversaId}` : "";
  window.open(`${href}${q}`, "_blank", "noopener,noreferrer");
}

function eventCanal(msg: Record<string, unknown>): string {
  const raw = typeof msg.canal === "string" ? msg.canal.trim() : "";
  return (raw || "WHATSAPP").toUpperCase();
}

/**
 * Mute + alerta visual/sonoro global quando chega MSG_RECEBIDA no WebSocket.
 * Abre Chat WhatsApp ou Chat SMS conforme `canal` do evento.
 */
export function WhatsAppInboundAlertControl() {
  const [muted, setMuted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastPlayedRef = useRef(0);

  useEffect(() => {
    setMuted(isWhatsAppAlertMuted());
    const onMute = (e: Event) => {
      const detail = (e as CustomEvent<{ muted: boolean }>).detail;
      if (detail && typeof detail.muted === "boolean") setMuted(detail.muted);
      else setMuted(isWhatsAppAlertMuted());
    };
    window.addEventListener("aires:whatsapp-alert-mute-changed", onMute);
    return () => window.removeEventListener("aires:whatsapp-alert-mute-changed", onMute);
  }, []);

  const onInbound = useCallback(
    (conversaId: string | null, canal: string) => {
      const now = Date.now();
      if (now - lastPlayedRef.current < 400) return;
      lastPlayedRef.current = now;

      const isSms = canal === "SMS";
      const href = isSms ? SMS_CHAT_HREF : WA_CHAT_HREF;
      const titulo = isSms ? "Nova mensagem SMS" : "Nova mensagem WhatsApp";

      playWhatsAppInboundChime();
      notifyWhatsAppInboundVisual(conversaId, canal);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1600);

      toast.custom(
        (id) => (
          <button
            type="button"
            className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border border-white/10 bg-[#1a1f2e] px-4 py-3 text-left shadow-lg"
            onClick={() => {
              openChatInNewTab(href, conversaId);
              toast.dismiss(id);
            }}
          >
            <span className="text-sm font-medium text-white">{titulo}</span>
            <span className="text-xs text-white/55">
              Clique para abrir o chat numa nova aba
            </span>
          </button>
        ),
        { duration: 5000 },
      );
    },
    [],
  );

  useEffect(() => {
    return subscribeRealtime((msg) => {
      if (msg.type !== "MSG_RECEBIDA") return;
      const conversaId =
        typeof msg.conversaId === "string" ? msg.conversaId : null;
      onInbound(conversaId, eventCanal(msg));
    });
  }, [onInbound]);

  function toggleMute() {
    unlockWhatsAppAlertAudio();
    const next = !muted;
    setWhatsAppAlertMuted(next);
    setMuted(next);
    if (!next) playWhatsAppInboundChime();
    toast.success(next ? "Som de mensagem silenciado" : "Som de mensagem ativado", {
      duration: 2000,
    });
  }

  return (
    <button
      type="button"
      onClick={toggleMute}
      className={cn(
        "relative p-2 rounded-full transition-colors",
        muted
          ? "text-white/35 hover:text-white/70"
          : "text-emerald-400/90 hover:text-emerald-300",
        pulse && !muted && "text-emerald-300",
      )}
      aria-label={muted ? "Ativar som de mensagem" : "Silenciar som de mensagem"}
      title={muted ? "Som silenciado — clique para ativar" : "Som ativo — clique para silenciar"}
    >
      {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
      {pulse && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-400/80 animate-ping"
          aria-hidden
        />
      )}
      {pulse && (
        <span
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
          aria-hidden
        />
      )}
    </button>
  );
}
