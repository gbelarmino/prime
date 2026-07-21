"use client";

import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryTickKind = "pending" | "sent" | "delivered" | "read" | "failed";

export function deliveryTickKind(status?: string | null): DeliveryTickKind {
  const s = (status ?? "").trim().toUpperCase();
  if (s === "FAILED" || s === "UNDELIVERED" || s === "CANCELED" || s === "CANCELLED") {
    return "failed";
  }
  if (s === "READ") return "read";
  if (s === "DELIVERED") return "delivered";
  if (
    s === "QUEUED" ||
    s === "PENDING" ||
    s === "ACCEPTED" ||
    s === "SCHEDULED" ||
    s === "SENDING" ||
    s === "ENVIANDO" ||
    s === "PENDENTE"
  ) {
    return "pending";
  }
  // SENT / DISPATCHED / desconhecido após envio → 1 check
  return "sent";
}

const LABELS: Record<DeliveryTickKind, string> = {
  pending: "Enviando…",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};

/** Checks estilo WhatsApp no rodapé da mensagem outbound. */
export function WhatsAppDeliveryTicks({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const kind = deliveryTickKind(status);
  const label = LABELS[kind];

  if (kind === "pending") {
    return (
      <span title={label} className={cn("inline-flex shrink-0", className)} aria-label={label}>
        <Clock className="h-3 w-3 opacity-70" strokeWidth={2.25} />
      </span>
    );
  }
  if (kind === "failed") {
    return (
      <span title={label} className={cn("inline-flex shrink-0 text-red-300", className)} aria-label={label}>
        <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }
  if (kind === "sent") {
    return (
      <span title={label} className={cn("inline-flex shrink-0 opacity-70", className)} aria-label={label}>
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0",
        kind === "read" ? "text-sky-300" : "opacity-70",
        className,
      )}
      aria-label={label}
    >
      <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}
