"use client";

import { MessageCircle, MessageSquare } from "lucide-react";
import type {
  TituloNotificacaoCanal,
  TituloSmsNotificacaoResumo,
  TituloWhatsAppNotificacaoResumo,
} from "@/lib/fin-service";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";
import {
  notificacaoChips,
  notificacaoStatusBadgeLabel,
  notificacaoStatusTone,
  TITULO_NOTIFICACAO_CANAL_LABELS,
  TITULO_NOTIFICACAO_CANAL_TONES,
  type TituloNotificacaoChip,
} from "@/lib/titulo-notificacao";
import { cn } from "@/lib/utils";

type TituloNotificacoesBadgeProps = {
  smsNotificacoes: TituloSmsNotificacaoResumo[];
  whatsappNotificacoes: TituloWhatsAppNotificacaoResumo[];
  onClick: () => void;
};

const CANAL_ICONS: Record<TituloNotificacaoCanal, typeof MessageSquare> = {
  SMS: MessageSquare,
  WHATSAPP: MessageCircle,
};

function statusTooltip(item: TituloNotificacaoChip): string {
  const canal = TITULO_NOTIFICACAO_CANAL_LABELS[item.canal];
  const label = notificacaoStatusBadgeLabel(item.canal, item.status, item.dataAgendada);
  const quando = item.dataEnvio ?? item.dataAgendada;
  const data = quando ? formatBusinessDateTimeWithSeconds(quando) : "—";
  return `${canal} #${item.id} · ${label} · ${data}`;
}

function CanalGrupo({ canal, itens }: { canal: TituloNotificacaoCanal; itens: TituloNotificacaoChip[] }) {
  const Icon = CANAL_ICONS[canal];
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-0.5 rounded-md border px-1 py-0.5",
        TITULO_NOTIFICACAO_CANAL_TONES[canal],
      )}
      title={`${itens.length} notificação(ões) por ${TITULO_NOTIFICACAO_CANAL_LABELS[canal]}`}
    >
      <Icon size={11} aria-hidden className="shrink-0" />
      <span className="sr-only">{TITULO_NOTIFICACAO_CANAL_LABELS[canal]}</span>
      {itens.map((item, index) => (
        <span
          key={item.key}
          title={statusTooltip(item)}
          className={cn(
            "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded border px-0.5 text-[9px] font-bold tabular-nums",
            notificacaoStatusTone(item.canal, item.status, item.dataAgendada),
          )}
        >
          {index + 1}
        </span>
      ))}
    </span>
  );
}

export function TituloNotificacoesBadge({
  smsNotificacoes,
  whatsappNotificacoes,
  onClick,
}: TituloNotificacoesBadgeProps) {
  const chips = notificacaoChips(smsNotificacoes, whatsappNotificacoes);
  const sms = chips.filter((item) => item.canal === "SMS");
  const whatsapp = chips.filter((item) => item.canal === "WHATSAPP");
  const hasItems = chips.length > 0;

  const title = hasItems
    ? `${chips.length} notificação(ões) enviada(s) — ${sms.length} por SMS, ${whatsapp.length} por WhatsApp. Clique para ver detalhes.`
    : "Nenhuma notificação enviada. Clique para ver histórico.";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        hasItems
          ? "border-white/10 bg-white/[0.04] text-white/70"
          : "border-white/10 bg-white/5 text-white/35",
      )}
      title={title}
      aria-label={title}
    >
      {hasItems ? (
        <>
          {sms.length > 0 ? <CanalGrupo canal="SMS" itens={sms} /> : null}
          {whatsapp.length > 0 ? <CanalGrupo canal="WHATSAPP" itens={whatsapp} /> : null}
        </>
      ) : (
        <>
          <MessageSquare size={11} aria-hidden className="shrink-0" />
          <span className="tabular-nums">0</span>
        </>
      )}
    </button>
  );
}
