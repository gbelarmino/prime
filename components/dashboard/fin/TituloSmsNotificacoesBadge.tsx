"use client";

import { MessageSquare } from "lucide-react";
import type { TituloSmsNotificacaoResumo } from "@/lib/fin-service";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";
import {
  smsFilaStatusBadgeLabel,
  smsFilaStatusTone,
} from "@/lib/sms-fila-status";
import { cn } from "@/lib/utils";

type TituloSmsNotificacoesBadgeProps = {
  notificacoes: TituloSmsNotificacaoResumo[];
  onClick: () => void;
};

function statusTooltip(item: TituloSmsNotificacaoResumo): string {
  const label = smsFilaStatusBadgeLabel(item.status, item.dataAgendada);
  const quando = item.dataEnvio ?? item.dataAgendada;
  const data = quando ? formatBusinessDateTimeWithSeconds(quando) : "—";
  return `#${item.id} · ${label} · ${data}`;
}

export function TituloSmsNotificacoesBadge({
  notificacoes,
  onClick,
}: TituloSmsNotificacoesBadgeProps) {
  const items = notificacoes ?? [];
  const hasItems = items.length > 0;

  const title = hasItems
    ? `${items.length} notificação(ões) SMS. Clique para ver detalhes.`
    : "Nenhuma notificação SMS. Clique para ver histórico.";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        hasItems
          ? "border-white/10 bg-white/[0.04] text-white/70"
          : "border-white/10 bg-white/5 text-white/35",
      )}
      title={title}
      aria-label={title}
    >
      <MessageSquare size={11} aria-hidden className="shrink-0" />
      {hasItems ? (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-0.5">
          {items.map((item) => {
            const label = smsFilaStatusBadgeLabel(item.status, item.dataAgendada);
            return (
              <span
                key={item.id}
                title={statusTooltip(item)}
                className={cn(
                  "inline-flex shrink-0 rounded border px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                  smsFilaStatusTone(item.status, item.dataAgendada),
                )}
              >
                {label}
              </span>
            );
          })}
        </span>
      ) : (
        <span className="tabular-nums">0</span>
      )}
    </button>
  );
}
