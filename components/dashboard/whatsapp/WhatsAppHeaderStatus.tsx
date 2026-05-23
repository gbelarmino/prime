"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

const CONEXAO_HREF = "/dashboard/whatsapp/conexao";
import { whatsappService, type WhatsAppLinhaComStatus } from "@/lib/whatsapp-service";

const POLL_MS = 25_000;

type ConnState = "open" | "connecting" | "close" | "loading" | "error" | "no_lines";

function pickLinhaParaStatus(list: WhatsAppLinhaComStatus[]): WhatsAppLinhaComStatus | null {
  return list.find((l) => l.padrao && l.ativo) ?? list.find((l) => l.ativo) ?? list[0] ?? null;
}

function connectionStateFromRow(row: WhatsAppLinhaComStatus): "open" | "connecting" | "close" {
  const s = row.connectionState;
  if (s === "open") return "open";
  if (s === "connecting") return "connecting";
  return "close";
}

export function WhatsAppHeaderStatus() {
  const [conn, setConn] = useState<ConnState>("loading");
  const [linhaLabel, setLinhaLabel] = useState<string | null>(null);
  const [relayHint, setRelayHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await whatsappService.listLinhasComStatus({ skipLoading: true });
      const row = pickLinhaParaStatus(list);
      if (!row) {
        setConn("no_lines");
        setLinhaLabel(null);
        setRelayHint(null);
        return;
      }
      setLinhaLabel(row.nome);
      setRelayHint(row.lastRelayError);
      setConn(connectionStateFromRow(row));
    } catch {
      setConn("error");
      setLinhaLabel(null);
      setRelayHint(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const statusText = useMemo(() => {
    switch (conn) {
      case "open":
        return "WhatsApp conectado";
      case "connecting":
        return "WhatsApp a ligar…";
      case "close":
        return "WhatsApp desligado";
      case "no_lines":
        return "Sem linha WhatsApp configurada";
      case "error":
        return "Não foi possível obter o estado do WhatsApp";
      default:
        return "A carregar estado do WhatsApp…";
    }
  }, [conn]);

  const tooltip = [statusText, linhaLabel, relayHint && conn !== "open" ? relayHint : null]
    .filter(Boolean)
    .join(" — ");

  const iconTone =
    conn === "open"
      ? "text-emerald-400"
      : conn === "connecting"
        ? "text-amber-400"
        : conn === "error"
          ? "text-rose-400"
          : "text-white/40";

  const dotClass =
    conn === "open"
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
      : conn === "connecting"
        ? "bg-amber-400 animate-pulse"
        : conn === "error"
          ? "bg-rose-500"
          : "bg-white/30";

  const navigateLabel = `${tooltip}. Abrir conexão WhatsApp`;

  return (
    <Link
      href={CONEXAO_HREF}
      className="relative p-2 text-gray-400 transition-colors hover:text-white no-underline"
      title={navigateLabel}
      aria-label={navigateLabel}
    >
      <MessageCircle size={24} className={iconTone} strokeWidth={2} />
      <span
        className={`absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-[#020817]/90 ${dotClass}`}
        aria-hidden
      />
    </Link>
  );
}
